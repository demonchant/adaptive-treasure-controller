import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server.mjs';

const appPort = Number(process.env.E2E_PORT ?? 4173);
let appBaseUrl = `http://127.0.0.1:${appPort}`;
const identityServer = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname !== '/choose') { res.writeHead(404).end(); return; }
  const state = encodeURIComponent(url.searchParams.get('state') ?? '');
  const alice = `${appBaseUrl}/auth/google/callback?state=${state}&code=alice`;
  const bob = `${appBaseUrl}/auth/google/callback?state=${state}&code=bob`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><title>Test identity provider</title><h1>Test identity provider</h1><a href="${alice}">Sign in as Alice</a><a href="${bob}">Sign in as Bob</a>`);
});

await new Promise((resolve) => identityServer.listen(0, '127.0.0.1', resolve));
const identityPort = identityServer.address().port;
const identityProvider = {
  configured: () => true,
  authorizationUrl: ({ state }) => `http://127.0.0.1:${identityPort}/choose?state=${encodeURIComponent(state)}`,
  async authenticateCallback({ code }) {
    if (!['alice', 'bob'].includes(code)) throw Object.assign(new Error('Unknown test user.'), { status: 401 });
    return { id: `test:${code}`, email: `${code}@example.test`, name: code === 'alice' ? 'Alice Test' : 'Bob Test' };
  },
};

const airwallex = {
  configured: () => true,
  async currentUsdCashBalance() { return { currency: 'USD', availableCents: 100_000, pendingCents: 2_500, reservedCents: 0, raw: { source: 'Playwright fixture' } }; },
  async validateTransfer({ amountCents }) { return { amount_payer_pays: (amountCents / 100).toFixed(2) }; },
  async createTransfer({ requestId, amountCents }) { return { id: 'tr_playwright_fixture', request_id: requestId, status: 'CREATED', amount_payer_pays: (amountCents / 100).toFixed(2) }; },
  async findTransferByRequestId() { return null; },
  async retrieveTransfer(id) { return { id, status: 'PROCESSING' }; },
};

const generatedDataDirectory = process.env.E2E_DATA_DIRECTORY ? null : mkdtempSync(join(tmpdir(), 'atc-playwright-'));
const app = createApplication({ identityProvider, airwallex, maxTransferFeeCents: 100, dataDirectory: process.env.E2E_DATA_DIRECTORY ?? generatedDataDirectory });
await new Promise((resolve) => app.server.listen(appPort, '127.0.0.1', resolve));
process.stdout.write(`Playwright app listening on ${appBaseUrl}\n`);

async function shutdown() {
  await Promise.all([
    new Promise((resolve) => app.server.close(resolve)),
    new Promise((resolve) => identityServer.close(resolve)),
  ]);
  if (generatedDataDirectory) rmSync(generatedDataDirectory, { recursive: true, force: true });
}
process.once('SIGINT', () => { void shutdown().then(() => process.exit(0)); });
process.once('SIGTERM', () => { void shutdown().then(() => process.exit(0)); });
