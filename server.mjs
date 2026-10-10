import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createServer as httpServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AirwallexClient, AirwallexError } from './lib/airwallex.mjs';
import { GoogleIdentityProvider, randomOAuthValue } from './lib/google-auth.mjs';
import { parseCents } from './lib/money.mjs';
import { approvalDigest, buildPlan } from './lib/planner.mjs';
import { TreasuryStore } from './lib/store.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicRoot = resolve(root, 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const planHash = (balance, reserveCents, obligations, asOf = Date.now(), maxTransferFeeCents = null) => createHash('sha256').update(JSON.stringify({ availableCents: balance.availableCents, reserveCents, maxTransferFeeCents, obligations: obligations.map(({ id, name, beneficiaryId, amountCents, currency, dueAt, priority, penaltyCents }) => ({ id, name, beneficiaryId, amountCents, currency, dueAt, priority, penaltyCents, overdue: Date.parse(dueAt) < asOf })) })).digest('hex');

function equalSecret(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

const knownProviderStatuses = new Set(['CREATED', 'IN_APPROVAL', 'SCHEDULED', 'PROCESSING', 'SENT', 'PAID', 'FAILED', 'CANCELLED', 'OVERDUE']);
function providerState(status) { return knownProviderStatuses.has(status) ? status : 'OUTCOME_UNKNOWN'; }

async function readJson(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 32_768) throw Object.assign(new Error('Request body too large'), { status: 413 }); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body));
}

export function createApplication({
  store = null,
  dataDirectory = process.env.USER_DATA_DIRECTORY ?? '.data/workspaces',
  airwallex = new AirwallexClient(),
  identityProvider = new GoogleIdentityProvider(),
  reserveCents = parseCents(process.env.RESERVE_USD ?? '30.00', 'RESERVE_USD'),
  maxTransferFeeCents = process.env.MAX_TRANSFER_FEE_USD?.trim() ? parseCents(process.env.MAX_TRANSFER_FEE_USD, 'MAX_TRANSFER_FEE_USD') : null,
  balanceMaxAgeSeconds = Number(process.env.BALANCE_MAX_AGE_SECONDS ?? 60),
  now = () => Date.now(),
} = {}) {
  const sessions = new Map();
  if (maxTransferFeeCents !== null && (!Number.isSafeInteger(maxTransferFeeCents) || maxTransferFeeCents <= 0)) throw new RangeError('MAX_TRANSFER_FEE_USD must be a positive amount when configured.');
  const oauthStates = new Map();
  const signInAttempts = new Map();
  const workspaceStores = new Map();
  const getWorkspaceStore = (userId) => {
    if (store) return store;
    if (!workspaceStores.has(userId)) {
      const fileId = createHash('sha256').update(userId).digest('hex');
      workspaceStores.set(userId, new TreasuryStore(resolve(root, dataDirectory, `${fileId}.sqlite`)));
    }
    return workspaceStores.get(userId);
  };
  let execution = Promise.resolve();

  const handler = async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    let workspaceStore = null;
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { ok: true });
      if (req.method === 'GET' && url.pathname === '/auth/google') {
        if (!identityProvider.configured()) return json(res, 503, { error: 'Google sign-in is not configured yet.' });
        const ip = req.socket.remoteAddress ?? 'unknown'; const bucket = signInAttempts.get(ip) ?? { count: 0, resetAt: now() + 60_000 };
        if (bucket.resetAt <= now()) { bucket.count = 0; bucket.resetAt = now() + 60_000; }
        if (bucket.count >= 20) return json(res, 429, { error: 'Too many sign-in attempts. Wait one minute and retry.' });
        bucket.count++; signInAttempts.set(ip, bucket);
        const state = randomOAuthValue(); const nonce = randomOAuthValue(); const codeVerifier = randomOAuthValue();
        for (const [key, value] of oauthStates) if (value.expiresAt <= now()) oauthStates.delete(key);
        oauthStates.set(state, { nonce, codeVerifier, expiresAt: now() + 10 * 60_000 });
        res.writeHead(302, { Location: identityProvider.authorizationUrl({ state, nonce, codeVerifier }), 'Cache-Control': 'no-store' }); res.end(); return;
      }
      if (req.method === 'GET' && url.pathname === '/auth/google/callback') {
        const state = url.searchParams.get('state'); const pending = state && oauthStates.get(state);
        if (!pending || pending.expiresAt <= now()) return json(res, 400, { error: 'Sign-in expired. Start again.' });
        oauthStates.delete(state);
        if (url.searchParams.has('error')) return json(res, 401, { error: 'Google sign-in was cancelled or denied.' });
        const code = url.searchParams.get('code');
        if (!code) return json(res, 400, { error: 'Google did not return an authorization code.' });
        const user = await identityProvider.authenticateCallback({ code, ...pending });
        const sid = randomBytes(32).toString('hex');
        const session = { csrf: randomBytes(24).toString('hex'), createdAt: now(), user };
        sessions.set(sid, session);
        const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
        res.writeHead(303, { Location: '/', 'Set-Cookie': `treasury_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`, 'Cache-Control': 'no-store' }); res.end(); return;
      }
      if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
        const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const file = resolve(publicRoot, relative);
        if (!file.startsWith(publicRoot + sep)) return json(res, 404, { error: 'Not found' });
        res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
        createReadStream(file).on('error', () => { if (!res.headersSent) json(res, 404, { error: 'Not found' }); }).pipe(res); return;
      }
      if (!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
      const cookies = Object.fromEntries((req.headers.cookie ?? '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((parts) => parts.length === 2));
      let session = sessions.get(cookies.treasury_session);
      if (session && (now() - session.createdAt > 8 * 60 * 60 * 1000)) { sessions.delete(cookies.treasury_session); session = null; }
      if (req.method === 'GET' && url.pathname === '/api/session') {
        return json(res, 200, { authenticated: Boolean(session?.user), user: session?.user ? { email: session.user.email, name: session.user.name } : null, csrf: session?.csrf ?? null, googleConfigured: identityProvider.configured() });
      }
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Origin rejected' });
        if (!session || req.headers['x-csrf-token'] !== session.csrf) return json(res, 403, { error: 'Session or CSRF check failed' });
      }
      if (!session?.user) return json(res, 401, { error: 'Sign in to access your workspace.' });
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        sessions.delete(cookies.treasury_session); res.setHeader('Set-Cookie', 'treasury_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return json(res, 200, { ok: true });
      }
      workspaceStore = getWorkspaceStore(session.user.id);
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const balance = workspaceStore.latestBalance(); const plan = workspaceStore.plan();
        const obligations = workspaceStore.obligations();
        const planStale = Boolean(plan && balance && planHash(balance, reserveCents, obligations, now(), maxTransferFeeCents) !== workspaceStore.planInputHash(plan.revision));
        return json(res, 200, { balance, balanceStale: !balance || now() - Date.parse(balance.capturedAt) > balanceMaxAgeSeconds * 1000, obligations, plan, planStale, approvals: plan ? workspaceStore.approvals(plan.revision) : [], operations: workspaceStore.operations(), sandboxConfigured: airwallex.configured(), reserveCents, maxTransferFeeCents, feeCapConfigured: maxTransferFeeCents !== null });
      }
      if (req.method === 'POST' && url.pathname === '/api/balance/refresh') {
        const snapshot = workspaceStore.saveBalance(await airwallex.currentUsdCashBalance()); return json(res, 200, { balance: snapshot });
      }
      if (req.method === 'POST' && url.pathname === '/api/obligations') {
        const body = await readJson(req); const name = String(body.name ?? '').trim();
        if (!name || name.length > 80) return json(res, 422, { error: 'Name is required and must be under 80 characters.' });
        if (typeof body.dueAt !== 'string' || !Number.isFinite(Date.parse(body.dueAt))) return json(res, 422, { error: 'A valid due date is required.' });
        if (!['CRITICAL', 'HIGH', 'NORMAL'].includes(body.priority)) return json(res, 422, { error: 'Invalid priority.' });
        const amountCents = parseCents(body.amount, 'amount'); if (amountCents < 1 || amountCents > 50_000_000) return json(res, 422, { error: 'Amount must be between $0.01 and $500,000.' });
        const beneficiaryId = body.beneficiaryId == null ? null : String(body.beneficiaryId).trim();
        if (beneficiaryId && !/^[\w-]{4,128}$/.test(beneficiaryId)) return json(res, 422, { error: 'Beneficiary ID has invalid format.' });
        return json(res, 201, { obligation: workspaceStore.addObligation({ name, beneficiaryId: beneficiaryId || null, amountCents, dueAt: new Date(body.dueAt).toISOString(), priority: body.priority }) });
      }
      if (req.method === 'POST' && url.pathname === '/api/plan') {
        const balance = workspaceStore.latestBalance();
        if (!balance || now() - Date.parse(balance.capturedAt) > balanceMaxAgeSeconds * 1000) return json(res, 409, { error: 'Refresh an Airwallex USD cash balance before planning.' });
        const input = { availableCents: balance.availableCents, reserveCents, obligations: workspaceStore.obligations() };
        const plan = buildPlan({ ...input, maxTransferFeeCents, asOf: new Date(now()).toISOString() }); const inputHash = planHash(balance, reserveCents, input.obligations, now(), maxTransferFeeCents);
        return json(res, 200, { plan: workspaceStore.savePlan(balance, reserveCents, plan, inputHash) });
      }
      if (req.method === 'POST' && url.pathname === '/api/approve') {
        const body = await readJson(req); const plan = workspaceStore.plan();
        if (maxTransferFeeCents === null) return json(res, 409, { error: 'Set MAX_TRANSFER_FEE_USD from your Airwallex fee schedule, then recalculate before approval.' });
        if (!plan || Number(body.revision) !== plan.revision) return json(res, 409, { error: 'Plan has changed; recalculate before approval.' });
        const currentBalance = workspaceStore.latestBalance();
        if (!currentBalance || now() - Date.parse(currentBalance.capturedAt) > balanceMaxAgeSeconds * 1000) return json(res, 409, { error: 'Balance is stale; refresh before approval.' });
        if (!currentBalance || planHash(currentBalance, reserveCents, workspaceStore.obligations(), now(), maxTransferFeeCents) !== workspaceStore.planInputHash(plan.revision)) return json(res, 409, { error: 'Inputs changed; recalculate before approval.' });
        const digest = approvalDigest(plan, String(body.obligationId ?? ''));
        if (body.digest !== digest) return json(res, 409, { error: 'Approval details do not match the current plan.' });
        const existing = workspaceStore.approval(plan.revision, body.obligationId);
        if (existing) return json(res, 200, { approval: existing, duplicate: true });
        const approval = workspaceStore.approve(plan.revision, body.obligationId, digest, session.user.id); return json(res, 201, { approval });
      }
      if (req.method === 'POST' && url.pathname === '/api/execute') {
        const body = await readJson(req);
        const action = async () => {
          const plan = workspaceStore.plan(); const obligation = workspaceStore.getObligation(String(body.obligationId ?? ''));
          if (!plan || Number(body.revision) !== plan.revision || !obligation) throw Object.assign(new Error('Plan or obligation is no longer current.'), { status: 409 });
          if (maxTransferFeeCents === null) throw Object.assign(new Error('Set MAX_TRANSFER_FEE_USD from your Airwallex fee schedule, recalculate, and obtain approval before execution.'), { status: 409 });
          const approvedInputs = workspaceStore.latestBalance();
          if (!approvedInputs || now() - Date.parse(approvedInputs.capturedAt) > balanceMaxAgeSeconds * 1000) throw Object.assign(new Error('Balance is stale; refresh, recalculate, and approve again.'), { status: 409 });
          if (!approvedInputs || planHash(approvedInputs, reserveCents, workspaceStore.obligations(), now(), maxTransferFeeCents) !== workspaceStore.planInputHash(plan.revision)) throw Object.assign(new Error('Inputs changed; recalculate and obtain a new approval.'), { status: 409 });
          const approval = workspaceStore.approval(plan.revision, obligation.id); const digest = approvalDigest(plan, obligation.id);
          if (!approval || !equalSecret(approval.approval_digest, digest)) throw Object.assign(new Error('A matching operator approval is required.'), { status: 403 });
          if (!obligation.beneficiaryId) throw Object.assign(new Error('Add a real Airwallex beneficiary ID before execution.'), { status: 422 });
          if (workspaceStore.operations().some((op) => op.obligation_id === obligation.id && ['SUBMITTING', 'OUTCOME_UNKNOWN', 'COST_UNVERIFIED', 'COST_MISMATCH', 'CREATED', 'IN_APPROVAL', 'SCHEDULED', 'PROCESSING', 'SENT'].includes(op.state))) throw Object.assign(new Error('An existing provider operation must be reconciled before another transfer.'), { status: 409 });
          const fresh = workspaceStore.saveBalance(await airwallex.currentUsdCashBalance());
          const recomputed = buildPlan({ availableCents: fresh.availableCents, reserveCents: plan.reserveCents, maxTransferFeeCents, obligations: workspaceStore.obligations() });
          const allowed = recomputed.decisions.find((item) => item.obligationId === obligation.id)?.action === 'PAY';
          if (!allowed || recomputed.availableCents !== plan.availableCents) {
            const changedPlan = workspaceStore.savePlan(fresh, plan.reserveCents, recomputed, 'execution-preflight');
            throw Object.assign(new Error(`Balance or decision changed; new plan revision ${changedPlan.revision} requires approval.`), { status: 409 });
          }
          const args = { requestId: randomUUID(), beneficiaryId: obligation.beneficiaryId, amountCents: obligation.amountCents, reference: obligation.name };
          const maxPayerCostCents = obligation.amountCents + maxTransferFeeCents;
          if (maxPayerCostCents > Math.max(0, fresh.availableCents - plan.reserveCents)) throw Object.assign(new Error('Obligation plus configured maximum fee would breach the reserve; transfer blocked.'), { status: 409 });
          await airwallex.validateTransfer(args);
          const operation = workspaceStore.createOperation(args.requestId, obligation.id, approval.id);
          try {
            const result = await airwallex.createTransfer(args);
            let operationState = providerState(result.status ?? 'CREATED');
            try {
              if (result.amount_payer_pays == null) operationState = 'COST_UNVERIFIED';
              else {
                const actualPayerCostCents = parseCents(result.amount_payer_pays, 'provider payer cost');
                if (actualPayerCostCents < obligation.amountCents || actualPayerCostCents > maxPayerCostCents) operationState = 'COST_MISMATCH';
              }
            } catch { operationState = 'COST_UNVERIFIED'; }
            workspaceStore.updateOperation(operation.id, operationState, result.id ?? result.transfer_id, result);
            return { operation: workspaceStore.operations().find((op) => op.id === operation.id) };
          } catch (error) {
            workspaceStore.updateOperation(operation.id, error.uncertain ? 'OUTCOME_UNKNOWN' : 'FAILED', null, { error: error.message }); throw error;
          }
        };
        const current = execution.then(action, action); execution = current.then(() => undefined, () => undefined);
        const result = await current; return json(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/reconcile') {
        const body = await readJson(req); const operation = workspaceStore.operations().find((item) => item.id === body.operationId);
        if (!operation) return json(res, 404, { error: 'Operation not found.' });
        if (operation.provider_transfer_id) {
          const result = await airwallex.retrieveTransfer(operation.provider_transfer_id);
          workspaceStore.updateOperation(operation.id, providerState(result.status), result.id, result);
        } else {
          const result = await airwallex.findTransferByRequestId(operation.request_id);
          if (result) workspaceStore.updateOperation(operation.id, providerState(result.status), result.id ?? result.transfer_id, result);
        }
        return json(res, 200, { operation: workspaceStore.operations().find((item) => item.id === operation.id) });
      }
      return json(res, 404, { error: 'Unknown API route' });
    } catch (error) {
      const status = error.status ?? (error instanceof AirwallexError ? error.status : 500);
      if (error instanceof AirwallexError && error.uncertain) {
        const op = workspaceStore?.operations().find((item) => item.state === 'SUBMITTING');
        if (op) workspaceStore.updateOperation(op.id, 'OUTCOME_UNKNOWN', null, { error: error.message });
      }
      return json(res, status, { error: status >= 500 ? 'Request failed safely. Check state and reconcile before retrying.' : error.message });
    }
  };
  const server = httpServer((req, res) => { void handler(req, res); });
  server.on('close', () => { for (const workspace of workspaceStores.values()) workspace.close(); workspaceStores.clear(); sessions.clear(); oauthStates.clear(); signInAttempts.clear(); });
  return { server, store, sessions };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApplication(); const host = process.env.HOST ?? '127.0.0.1'; const port = Number(process.env.PORT ?? 8080);
  app.server.listen(port, host, () => process.stdout.write(`Adaptive Treasury Controller listening on http://${host}:${port}\n`));
}
