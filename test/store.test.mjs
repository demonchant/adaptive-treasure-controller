import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TreasuryStore } from '../lib/store.mjs';

test('SQLite state survives restart and deduplicates provider request IDs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'treasury-'));
  const path = join(directory, 'state.sqlite');
  let store = new TreasuryStore(path);
  const balance = store.saveBalance({ currency: 'USD', availableCents: 12000, pendingCents: 9000, reservedCents: 0, raw: { testFixture: true } });
  const obligation = store.addObligation({ name: 'Test payee', amountCents: 5000, dueAt: '2026-10-20T00:00:00.000Z', priority: 'HIGH' });
  const operation = store.createOperation('request-once', obligation.id, 'approval-once');
  store.updateOperation(operation.id, 'OUTCOME_UNKNOWN', null, { testFixture: true });
  store.close();
  store = new TreasuryStore(path);
  assert.equal(store.latestBalance().availableCents, balance.availableCents);
  assert.equal(store.obligations()[0].name, 'Test payee');
  assert.equal(store.operations()[0].state, 'OUTCOME_UNKNOWN');
  assert.throws(() => store.createOperation('request-once', obligation.id, 'approval-once'), /UNIQUE/);
  store.close();
  rmSync(directory, { recursive: true, force: true });
});
