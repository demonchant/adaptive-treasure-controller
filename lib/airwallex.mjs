import { parseCents, centsToProviderAmount } from './money.mjs';

const API = 'https://api.sandbox.airwallex.com';
export class AirwallexError extends Error {
  constructor(message, status = 502, uncertain = false) { super(message); this.status = status; this.uncertain = uncertain; }
}

export class AirwallexClient {
  constructor({ clientId = process.env.AWX_CLIENT_ID, apiKey = process.env.AWX_API_KEY, loginAs = process.env.AWX_LOGIN_AS, fetchImpl = fetch } = {}) {
    this.clientId = clientId; this.apiKey = apiKey; this.loginAs = loginAs; this.fetch = fetchImpl; this.token = null; this.tokenExpiresAt = 0;
  }
  configured() { return Boolean(this.clientId && this.apiKey); }
  async accessToken() {
    if (!this.configured()) throw new AirwallexError('Airwallex sandbox credentials are not configured.', 503);
    if (this.token && this.tokenExpiresAt > Date.now() + 30_000) return this.token;
    let response;
    try { response = await this.fetch(`${API}/api/v1/authentication/login`, { method: 'POST', signal: AbortSignal.timeout(10_000), headers: { 'Content-Type': 'application/json', 'x-client-id': this.clientId, 'x-api-key': this.apiKey, ...(this.loginAs ? { 'x-login-as': this.loginAs } : {}) } }); }
    catch { throw new AirwallexError('Airwallex authentication request failed.', 502); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token) throw new AirwallexError('Airwallex authentication was rejected.', response.status === 401 ? 503 : 502);
    this.token = body.token;
    const expiresAt = Date.parse(body.expires_at ?? '');
    this.tokenExpiresAt = Number.isFinite(expiresAt) ? expiresAt : Date.now() + Number(body.expires_in ?? 1800) * 1000;
    return this.token;
  }
  async request(path, { method = 'GET', body, uncertain = false } = {}) {
    const token = await this.accessToken(); let response;
    try { response = await this.fetch(`${API}${path}`, { method, signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new AirwallexError(uncertain ? 'Transfer outcome unknown; reconcile by request ID before retrying.' : 'Airwallex request failed.', 502, uncertain); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new AirwallexError(`Airwallex request rejected (${response.status}).`, response.status >= 500 ? 502 : 422, uncertain && response.status >= 500);
    return data;
  }
  async currentUsdCashBalance() {
    const rows = await this.request('/api/v1/balances/current?account_type=cash');
    if (!Array.isArray(rows)) throw new AirwallexError('Airwallex returned an unexpected balance response.');
    const row = rows.find((item) => item.account_type === 'cash' && item.currency === 'USD');
    if (!row) throw new AirwallexError('No USD cash balance is available in the Airwallex account.', 409);
    return { currency: 'USD', availableCents: parseCents(row.available_amount, 'available_amount'), pendingCents: parseCents(row.pending_amount ?? 0, 'pending_amount'), reservedCents: parseCents(row.reserved_amount ?? 0, 'reserved_amount'), raw: row };
  }
  transferPayload({ requestId, beneficiaryId, amountCents, reference }) {
    if (!beneficiaryId || typeof beneficiaryId !== 'string') throw new TypeError('Airwallex beneficiary ID is required');
    if (typeof reference !== 'string' || !reference.trim()) throw new TypeError('transfer reference is required');
    return { request_id: requestId, beneficiary_id: beneficiaryId, source_currency: 'USD', transfer_currency: 'USD', transfer_amount: centsToProviderAmount(amountCents), transfer_method: 'LOCAL', reason: 'goods_purchased', reference: reference.slice(0, 40), fee_paid_by: 'PAYER' };
  }
  async validateTransfer(args) { return this.request('/api/v1/transfers/validate', { method: 'POST', body: this.transferPayload(args) }); }
  async createTransfer(args) { return this.request('/api/v1/transfers/create', { method: 'POST', body: this.transferPayload(args), uncertain: true }); }
  async findTransferByRequestId(requestId) {
    const result = await this.request(`/api/v1/transfers?request_id=${encodeURIComponent(requestId)}`);
    const transfers = Array.isArray(result) ? result : result.items ?? result.data ?? [];
    return transfers.find((item) => item.request_id === requestId) ?? null;
  }
  async retrieveTransfer(id) { return this.request(`/api/v1/transfers/${encodeURIComponent(id)}`); }
}
