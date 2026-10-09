const priorityRank = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };

export function buildPlan({ availableCents, reserveCents, obligations, asOf = new Date().toISOString() }) {
  if (!Number.isSafeInteger(availableCents) || availableCents < 0) throw new RangeError('availableCents must be a non-negative safe integer');
  if (!Number.isSafeInteger(reserveCents) || reserveCents < 0) throw new RangeError('reserveCents must be a non-negative safe integer');
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
    if (item.amountCents <= remainingCents) {
      remainingCents -= item.amountCents;
      return { obligationId: item.id, action: 'PAY', amountCents: item.amountCents, overdue, reason: overdue ? 'Overdue; fits available funds above reserve.' : 'Fits available funds above reserve.' };
    }
    return { obligationId: item.id, action: overdue ? 'ESCALATE' : 'DEFER', amountCents: item.amountCents, overdue, reason: overdue ? 'Overdue and cannot be funded without breaching reserve.' : 'Insufficient headroom without breaching reserve.' };
  });
  return { asOf, availableCents, reserveCents, reserveShortfallCents: Math.max(0, reserveCents - availableCents), headroomCents, plannedSpendCents: headroomCents - remainingCents, remainingCents, decisions, algorithm: 'priority-due-penalty-id greedy v1' };
}

export function approvalDigest(plan, obligationId) {
  const decision = plan.decisions.find((item) => item.obligationId === obligationId);
  if (!decision || decision.action !== 'PAY') throw new Error('Only a PAY decision can be approved');
  return JSON.stringify({ revision: plan.revision, obligationId, amountCents: decision.amountCents, availableCents: plan.availableCents, reserveCents: plan.reserveCents, inputHash: plan.inputHash, action: decision.action, overdue: decision.overdue, reason: decision.reason });
}
