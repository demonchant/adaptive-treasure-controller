import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AirwallexError } from '../lib/airwallex.mjs';
import { approvalDigest } from '../lib/planner.mjs';
import { TreasuryStore } from '../lib/store.mjs';
import { createApplication } from '../server.mjs';
import { signIn, testIdentityProvider } from './helpers/identity.mjs';

test('HTTP workflow uses passwordless sessions, CSRF, changed-input approvals, timeout reconciliation and duplicate protection', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'treasury-server-'));
  const store = new TreasuryStore(join(directory, 'state.sqlite'));
  let availableCents = 10000;
  const airwallex = {
    configured: () => true,
    currentUsdCashBalance: async () => ({ currency: 'USD', availableCents, pendingCents: 40000, reservedCents: 0, raw: { fixture: true } }),
    validateTransfer: async () => ({ amount_payer_pays: 20 }),
    createTransfer: async () => { throw new AirwallexError('uncertain', 502, true); },
    findTransferByRequestId: async () => null,
    retrieveTransfer: async (id) => ({ id, status: 'PROCESSING' }),
  };
  const app = createApplication({ store, airwallex, identityProvider: testIdentityProvider, reserveCents: 1000, balanceMaxAgeSeconds: 60 });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => app.server.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = (path, body, cookie, csrf) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(body ?? {}) });

  assert.equal((await post('/api/obligations', {})).status, 403);
  const { cookie, csrf, authenticated } = await signIn(base);
  assert.equal(authenticated, true);
  assert.equal((await post('/api/obligations', {}, cookie, 'wrong')).status, 403);
  assert.equal((await post('/api/balance/refresh', {}, cookie, csrf)).status, 200);
  const add = await post('/api/obligations', { name: 'Critical supplier', amount: '20.00', dueAt: '2026-10-20T23:59:59Z', priority: 'CRITICAL', beneficiaryId: 'bene_test_123' }, cookie, csrf);
  assert.equal(add.status, 201); const { obligation } = await add.json();
  const planned = await post('/api/plan', {}, cookie, csrf); assert.equal(planned.status, 200); const { plan } = await planned.json();
  assert.equal((await post('/api/approve', { revision: plan.revision, obligationId: obligation.id, digest: 'forged' }, cookie, csrf)).status, 409);
  assert.equal((await post('/api/approve', { revision: plan.revision, obligationId: obligation.id, digest: approvalDigest(plan, obligation.id) }, cookie)).status, 403);
  const approve = await post('/api/approve', { revision: plan.revision, obligationId: obligation.id, digest: approvalDigest(plan, obligation.id) }, cookie, csrf);
  assert.equal(approve.status, 201);
  const execute = await post('/api/execute', { revision: plan.revision, obligationId: obligation.id }, cookie, csrf);
  assert.equal(execute.status, 502);
  const state = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.equal(state.operations[0].state, 'OUTCOME_UNKNOWN');
  assert.equal(state.balance.pendingCents, 40000);
  assert.equal((await post('/api/execute', { revision: plan.revision, obligationId: obligation.id }, cookie, csrf)).status, 409);
  const reconciled = await post('/api/reconcile', { operationId: state.operations[0].id }, cookie, csrf);
  assert.equal(reconciled.status, 200);
  assert.equal((await reconciled.json()).operation.state, 'OUTCOME_UNKNOWN');
});

test('balance and obligation changes block stale-plan approval', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'treasury-stale-')); const store = new TreasuryStore(join(directory, 'state.sqlite'));
  const airwallex = { configured: () => false, currentUsdCashBalance: async () => ({ currency: 'USD', availableCents: 10000, pendingCents: 0, reservedCents: 0, raw: {} }) };
  let currentNow = Date.now();
  const app = createApplication({ store, airwallex, identityProvider: testIdentityProvider, reserveCents: 1000, balanceMaxAgeSeconds: 60, now: () => currentNow });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => app.server.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const { cookie, csrf } = await signIn(base);
  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf }, body: JSON.stringify(body ?? {}) });
  await post('/api/balance/refresh');
  await post('/api/obligations', { name: 'First', amount: '10.00', dueAt: '2026-10-20T00:00:00Z', priority: 'HIGH' });
  const plan = await (await post('/api/plan')).json();
  const firstDecision = plan.plan.decisions[0];
  currentNow += 61_000;
  assert.equal((await post('/api/approve', { revision: plan.plan.revision, obligationId: firstDecision.obligationId, digest: approvalDigest(plan.plan, firstDecision.obligationId) })).status, 409);
  await post('/api/obligations', { name: 'New critical', amount: '80.00', dueAt: '2026-10-20T00:00:00Z', priority: 'CRITICAL' });
  const state = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.equal(state.planStale, true);
  assert.equal((await post('/api/approve', { revision: plan.plan.revision, obligationId: plan.plan.decisions[0].obligationId, digest: approvalDigest(plan.plan, plan.plan.decisions[0].obligationId) })).status, 409);
});

test('provider cost mismatch is persisted, redacted, and blocks a second payout', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'treasury-cost-')); const store = new TreasuryStore(join(directory, 'state.sqlite'));
  const airwallex = {
    configured: () => true,
    currentUsdCashBalance: async () => ({ currency: 'USD', availableCents: 10000, pendingCents: 0, reservedCents: 0, raw: {} }),
    validateTransfer: async () => ({ amount_payer_pays: 20 }),
    createTransfer: async ({ requestId }) => ({ id: 'tr_sandbox_1', request_id: requestId, status: 'CREATED', amount_payer_pays: 21, beneficiary: { bank_details: { account_number: 'must-not-persist' } } }),
    retrieveTransfer: async (id) => ({ id, status: 'PROCESSING' }),
    findTransferByRequestId: async () => null,
  };
  const app = createApplication({ store, airwallex, identityProvider: testIdentityProvider, reserveCents: 1000 });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise((resolve) => app.server.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const { cookie, csrf } = await signIn(base);
  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf }, body: JSON.stringify(body ?? {}) });
  await post('/api/balance/refresh');
  const add = await post('/api/obligations', { name: 'Supplier', amount: '20.00', dueAt: '2026-10-20T00:00:00Z', priority: 'HIGH', beneficiaryId: 'bene_sandbox_123' });
  const { obligation } = await add.json(); const plan = (await (await post('/api/plan')).json()).plan;
  const digest = approvalDigest(plan, obligation.id);
  await post('/api/approve', { revision: plan.revision, obligationId: obligation.id, digest });
  assert.equal((await post('/api/execute', { revision: plan.revision, obligationId: obligation.id })).status, 200);
  const state = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.equal(state.operations[0].state, 'COST_MISMATCH');
  assert.equal(JSON.stringify(state.operations[0]).includes('must-not-persist'), false);
  assert.equal((await post('/api/execute', { revision: plan.revision, obligationId: obligation.id })).status, 409);
});
