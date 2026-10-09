import test from 'node:test';
import assert from 'node:assert/strict';
import { centsToProviderAmount, formatUsd, parseCents } from '../lib/money.mjs';
import { buildPlan, approvalDigest } from '../lib/planner.mjs';

const obligation = (id, amountCents, priority = 'NORMAL', dueAt = '2026-10-20T00:00:00.000Z') => ({ id, amountCents, priority, dueAt });

test('decimal amounts become exact cents and reject precision/invalid input', () => {
  assert.equal(parseCents('0.10'), 10);
  assert.equal(parseCents('1234.5'), 123450);
  assert.equal(centsToProviderAmount(123450), '1234.50');
  assert.equal(formatUsd(10), '$0.10');
  for (const value of ['-1', '1.001', '1e2', 'NaN', '01.00']) assert.throws(() => parseCents(value));
});

test('allocates in deterministic priority and due-date order without crossing reserve', () => {
  const result = buildPlan({ availableCents: 13000, reserveCents: 3000, asOf: '2026-10-09T00:00:00Z', obligations: [obligation('B', 7000, 'HIGH'), obligation('C', 3000), obligation('A', 4000, 'CRITICAL')] });
  assert.deepEqual(result.decisions.map(({ obligationId, action }) => [obligationId, action]), [['A', 'PAY'], ['B', 'DEFER'], ['C', 'PAY']]);
  assert.equal(result.remainingCents, 3000);
  assert.ok(result.availableCents - result.plannedSpendCents >= result.reserveCents);
});

test('pending and forecast inflows are not inputs to spendable liquidity', () => {
  const base = { availableCents: 10000, reserveCents: 3000, asOf: '2026-10-09T00:00:00.000Z', obligations: [obligation('rent', 8000)] };
  const actual = buildPlan(base);
  const withUnspendableData = buildPlan({ ...base, pendingCents: 90000, expectedReceiptCents: 90000, receiptStatus: 'EXPECTED' });
  assert.equal(actual.decisions[0].action, 'DEFER');
  assert.deepEqual(actual, withUnspendableData);
});

test('sudden available-balance reduction recalculates to a safer plan', () => {
  const items = [obligation('critical', 5000, 'CRITICAL'), obligation('normal', 5000)];
  const initial = buildPlan({ availableCents: 15000, reserveCents: 3000, obligations: items });
  const revised = buildPlan({ availableCents: 8000, reserveCents: 3000, obligations: items });
  assert.deepEqual(initial.decisions.map((item) => item.action), ['PAY', 'PAY']);
  assert.deepEqual(revised.decisions.map((item) => item.action), ['PAY', 'DEFER']);
});

test('reserve floor rejects payment; overdue unfunded obligations escalate', () => {
  const result = buildPlan({ availableCents: 5000, reserveCents: 5000, asOf: '2026-10-09T00:00:00Z', obligations: [obligation('overdue', 1, 'CRITICAL', '2026-10-08T00:00:00Z')] });
  assert.equal(result.decisions[0].action, 'ESCALATE');
  assert.equal(result.plannedSpendCents, 0);
});

test('the same-currency slice does not model FX fees or claim FX optimization', () => {
  const result = buildPlan({ availableCents: 10000, reserveCents: 1000, obligations: [obligation('usd', 9000)] });
  assert.equal(result.decisions[0].action, 'PAY');
  assert.equal(result.algorithm.includes('FX'), false);
});

test('stale or invalid plan inputs fail closed; non-pay actions cannot be approved', () => {
  assert.throws(() => buildPlan({ availableCents: -1, reserveCents: 0, obligations: [] }));
  const result = buildPlan({ availableCents: 5000, reserveCents: 4000, obligations: [obligation('x', 2000)] });
  assert.throws(() => approvalDigest({ ...result, revision: 1 }, 'x'), /PAY decision/);
});

test('changed information creates a new revision and invalidates the old approval identity', () => {
  const before = buildPlan({ availableCents: 10000, reserveCents: 1000, obligations: [obligation('x', 4000)] });
  const after = buildPlan({ availableCents: 10000, reserveCents: 1000, obligations: [obligation('x', 4000), obligation('new-critical', 7000, 'CRITICAL')] });
  assert.equal(before.decisions[0].action, 'PAY');
  assert.equal(after.decisions.find((item) => item.obligationId === 'x').action, 'DEFER');
});
