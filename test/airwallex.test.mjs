import test from 'node:test';
import assert from 'node:assert/strict';
import { AirwallexClient, AirwallexError } from '../lib/airwallex.mjs';

test('sandbox adapter authenticates server-side, selects USD cash, and preserves balance categories', async () => {
  const requests = [];
  const client = new AirwallexClient({
    clientId: 'sandbox-client', apiKey: 'sandbox-key', loginAs: 'account-target',
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      if (url.endsWith('/authentication/login')) return new Response(JSON.stringify({ token: 'short-lived-token', expires_at: new Date(Date.now() + 1_800_000).toISOString() }), { status: 201 });
      return new Response(JSON.stringify([
        { account_type: 'cash', currency: 'EUR', available_amount: 500 },
        { account_type: 'cash', currency: 'USD', available_amount: 1234.56, pending_amount: 78.9, reserved_amount: 2.34, total_amount: 1315.8 },
      ]), { status: 200 });
    },
  });
  const result = await client.currentUsdCashBalance();
  assert.equal(result.availableCents, 123456);
  assert.equal(result.pendingCents, 7890);
  assert.equal(result.reservedCents, 234);
  assert.match(requests[0].url, /^https:\/\/api\.sandbox\.airwallex\.com\//);
  assert.equal(requests[0].init.headers['x-client-id'], 'sandbox-client');
  assert.equal(requests[0].init.headers['x-api-key'], 'sandbox-key');
  assert.equal(requests[0].init.headers['x-login-as'], 'account-target');
  assert.equal(requests[1].init.headers.Authorization, 'Bearer short-lived-token');
});

test('adapter does not fall back to synthetic balances when credentials are absent', async () => {
  const client = new AirwallexClient({ clientId: '', apiKey: '', fetchImpl: async () => { throw new Error('must not fetch'); } });
  await assert.rejects(client.currentUsdCashBalance(), (error) => error instanceof AirwallexError && error.status === 503);
});
