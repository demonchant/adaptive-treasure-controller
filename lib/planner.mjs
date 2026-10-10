const priorityRank = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };

export function buildPlan({ availableCents, reserveCents, obligations, maxTransferFeeCents = null, asOf = new Date().toISOString() }) {
  if (!Number.isSafeInteger(availableCents) || availableCents < 0) throw new RangeError('availableCents must be a non-negative safe integer');
  if (!Number.isSafeInteger(reserveCents) || reserveCents < 0) throw new RangeError('reserveCents must be a non-negative safe integer');
  if (maxTransferFeeCents !== null && (!Number.isSafeInteger(maxTransferFeeCents) || maxTransferFeeCents <= 0)) throw new RangeError('maxTransferFeeCents must be a positive safe integer or null');
  if (!Array.isArray(obligations)) throw new TypeError('obligations must be an array');
  const ids = new Set();
  const sorted = obligations.map((item) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new TypeError('each obligation needs a unique id');
    ids.add(item.id);
    if (!Number.isSafeInteger(item.amountCents) || item.amountCents <= 0) throw new RangeError(`invalid amount for ${item.id}`);
    if (!Object.hasOwn(priorityRank, item.priority)) throw new RangeError(`invalid priority for ${item.id}`);
    if (!Number.isFinite(Date.parse(item.dueAt))) throw new RangeError(`invalid due date for ${item.id}`);
    if (item.status && item.status !== 'OPEN') throw new RangeError(`obligation ${item.id} is not open`);
    return item;
  }).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]
    || Date.parse(a.dueAt) - Date.parse(b.dueAt)
    || (b.penaltyCents ?? 0) - (a.penaltyCents ?? 0)
    || a.id.localeCompare(b.id));
  const headroomCents = Math.max(0, availableCents - reserveCents);
  let remainingCents = headroomCents;
  const decisions = sorted.map((item) => {
    const overdue = Date.parse(item.dueAt) < Date.parse(asOf);
    const maxPayerCostCents = maxTransferFeeCents === null ? null : item.amountCents + maxTransferFeeCents;
    const plannedCostCents = maxPayerCostCents ?? item.amountCents;
    if (!Number.isSafeInteger(plannedCostCents)) throw new RangeError(`planned payer cost is too large for ${item.id}`);
    if (plannedCostCents <= remainingCents) {
      remainingCents -= plannedCostCents;
      return { obligationId: item.id, action: 'PAY', amountCents: item.amountCents, feeCapCents: maxTransferFeeCents, maxPayerCostCents, overdue, reason: maxTransferFeeCents === null ? 'Fits available funds above reserve before fees.' : (overdue ? 'Overdue; obligation plus maximum fee fits above reserve.' : 'Obligation plus maximum fee fits above reserve.') };
    }
    return { obligationId: item.id, action: overdue ? 'ESCALATE' : 'DEFER', amountCents: item.amountCents, feeCapCents: maxTransferFeeCents, maxPayerCostCents, overdue, reason: overdue ? 'Overdue; obligation plus maximum fee cannot be funded above reserve.' : 'Insufficient headroom for obligation plus maximum fee without breaching reserve.' };
  });
  return { asOf, availableCents, reserveCents, maxTransferFeeCents, reserveShortfallCents: Math.max(0, reserveCents - availableCents), headroomCents, plannedSpendCents: headroomCents - remainingCents, remainingCents, decisions, algorithm: 'priority-due-penalty-id greedy v2-fee-cap' };
}

export function approvalDigest(plan, obligationId) {
  const decision = plan.decisions.find((item) => item.obligationId === obligationId);
  if (!decision || decision.action !== 'PAY') throw new Error('Only a PAY decision can be approved');
  return JSON.stringify({ revision: plan.revision, obligationId, amountCents: decision.amountCents, feeCapCents: decision.feeCapCents, maxPayerCostCents: decision.maxPayerCostCents, availableCents: plan.availableCents, reserveCents: plan.reserveCents, inputHash: plan.inputHash, action: decision.action, overdue: decision.overdue, reason: decision.reason });
}
