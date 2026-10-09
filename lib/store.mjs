import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class TreasuryStore {
  constructor(path = '.data/treasury.sqlite') {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS balance_snapshots (id TEXT PRIMARY KEY, currency TEXT NOT NULL, available_cents INTEGER NOT NULL, pending_cents INTEGER NOT NULL, reserved_cents INTEGER NOT NULL, captured_at TEXT NOT NULL, raw_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS obligations (id TEXT PRIMARY KEY, name TEXT NOT NULL, beneficiary_id TEXT, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL CHECK(currency = 'USD'), due_at TEXT NOT NULL, priority TEXT NOT NULL, penalty_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'OPEN', created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plan_revisions (revision INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, balance_id TEXT NOT NULL, reserve_cents INTEGER NOT NULL, plan_json TEXT NOT NULL, input_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, obligation_id TEXT NOT NULL, approval_digest TEXT NOT NULL, approved_at TEXT NOT NULL, actor TEXT NOT NULL, UNIQUE(revision, obligation_id));
      CREATE TABLE IF NOT EXISTS provider_operations (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, obligation_id TEXT NOT NULL, approval_id TEXT NOT NULL UNIQUE, state TEXT NOT NULL, provider_transfer_id TEXT, response_json TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, type TEXT NOT NULL, details_json TEXT NOT NULL);
    `);
  }
  event(type, details) { this.db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?)').run(randomUUID(), new Date().toISOString(), type, JSON.stringify(details)); }
  saveBalance(balance) {
    const id = randomUUID(); const capturedAt = new Date().toISOString();
    this.db.prepare('INSERT INTO balance_snapshots VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, balance.currency, balance.availableCents, balance.pendingCents, balance.reservedCents, capturedAt, JSON.stringify(balance.raw));
    this.event('BALANCE_REFRESHED', { id, currency: balance.currency, availableCents: balance.availableCents, pendingCents: balance.pendingCents });
    return { id, capturedAt, ...balance };
  }
  latestBalance() {
    const row = this.db.prepare('SELECT * FROM balance_snapshots ORDER BY captured_at DESC LIMIT 1').get();
    return row ? { id: row.id, currency: row.currency, availableCents: row.available_cents, pendingCents: row.pending_cents, reservedCents: row.reserved_cents, capturedAt: row.captured_at } : null;
  }
  addObligation(input) {
    const id = randomUUID();
    this.db.prepare('INSERT INTO obligations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, input.name, input.beneficiaryId ?? null, input.amountCents, 'USD', input.dueAt, input.priority, input.penaltyCents ?? 0, 'OPEN', new Date().toISOString());
    this.event('OBLIGATION_ADDED', { id, amountCents: input.amountCents }); return this.getObligation(id);
  }
  getObligation(id) { const row = this.db.prepare('SELECT * FROM obligations WHERE id = ?').get(id); return row ? this.mapObligation(row) : null; }
  obligations() { return this.db.prepare("SELECT * FROM obligations WHERE status = 'OPEN' ORDER BY created_at").all().map((row) => this.mapObligation(row)); }
  mapObligation(row) { return { id: row.id, name: row.name, beneficiaryId: row.beneficiary_id, amountCents: row.amount_cents, currency: row.currency, dueAt: row.due_at, priority: row.priority, penaltyCents: row.penalty_cents, status: row.status }; }
  savePlan(balance, reserveCents, plan, inputHash) {
    const result = this.db.prepare('INSERT INTO plan_revisions (created_at, balance_id, reserve_cents, plan_json, input_hash) VALUES (?, ?, ?, ?, ?)').run(new Date().toISOString(), balance.id, reserveCents, JSON.stringify(plan), inputHash);
    const revision = Number(result.lastInsertRowid); const saved = { ...plan, revision, inputHash };
    this.db.prepare('UPDATE plan_revisions SET plan_json = ? WHERE revision = ?').run(JSON.stringify(saved), revision);
    this.event('PLAN_CREATED', { revision, inputHash }); return saved;
  }
  plan(revision) {
    const row = revision == null ? this.db.prepare('SELECT plan_json FROM plan_revisions ORDER BY revision DESC LIMIT 1').get() : this.db.prepare('SELECT plan_json FROM plan_revisions WHERE revision = ?').get(revision);
    return row ? JSON.parse(row.plan_json) : null;
  }
  planInputHash(revision) {
    const row = this.db.prepare('SELECT input_hash FROM plan_revisions WHERE revision = ?').get(revision);
    return row?.input_hash ?? null;
  }
  approvals(revision) {
    return this.db.prepare('SELECT id, revision, obligation_id, approval_digest, approved_at, actor FROM approvals WHERE revision = ?').all(revision);
  }
  approve(revision, obligationId, digest, actor) {
    const id = randomUUID(); this.db.prepare('INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?)').run(id, revision, obligationId, digest, new Date().toISOString(), actor);
    this.event('ACTION_APPROVED', { id, revision, obligationId, actor }); return { id, revision, obligationId, digest };
  }
  approval(revision, obligationId) { return this.db.prepare('SELECT * FROM approvals WHERE revision = ? AND obligation_id = ?').get(revision, obligationId) ?? null; }
  createOperation(requestId, obligationId, approvalId) {
    const id = randomUUID(); this.db.prepare('INSERT INTO provider_operations VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)').run(id, requestId, obligationId, approvalId, 'SUBMITTING', new Date().toISOString());
    this.event('TRANSFER_SUBMITTING', { id, requestId, obligationId }); return { id, requestId, obligationId, approvalId, state: 'SUBMITTING' };
  }
  updateOperation(id, state, transferId, response) {
    const safeResponse = response && typeof response === 'object' ? Object.fromEntries(Object.entries(response).filter(([key]) => ['id', 'request_id', 'status', 'amount_payer_pays', 'amount_beneficiary_receives', 'fee_amount', 'fee_currency', 'transfer_amount', 'transfer_currency', 'source_amount', 'source_currency', 'created_at', 'updated_at'].includes(key))) : response;
    this.db.prepare('UPDATE provider_operations SET state = ?, provider_transfer_id = COALESCE(?, provider_transfer_id), response_json = ?, updated_at = ? WHERE id = ?').run(state, transferId ?? null, safeResponse == null ? null : JSON.stringify(safeResponse), new Date().toISOString(), id);
    this.event('TRANSFER_STATE_CHANGED', { id, state, transferId: transferId ?? null });
  }
  operations() { return this.db.prepare('SELECT * FROM provider_operations ORDER BY updated_at DESC').all().map((row) => ({ ...row, response: row.response_json ? JSON.parse(row.response_json) : null })); }
  close() { this.db.close(); }
}
