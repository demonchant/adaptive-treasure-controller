export const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

export function parseCents(value, label = 'amount') {
  if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError(`${label} must be a decimal amount`);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw new RangeError(`${label} must be non-negative USD with at most 2 decimals`);
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  if (cents > MAX_SAFE_CENTS) throw new RangeError(`${label} is too large`);
  return Number(cents);
}

export function formatUsd(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError('cents must be a non-negative safe integer');
  return `$${Math.floor(cents / 100).toLocaleString('en-US')}.${String(cents % 100).padStart(2, '0')}`;
}

export function centsToProviderAmount(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new RangeError('transfer amount must be positive safe cents');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
