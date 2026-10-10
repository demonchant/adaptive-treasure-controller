# Implementation Plan and Phase Status

**Updated:** October 9, 2026. The user instructed us to continue despite unresolved organizer rules. This repository is separate from `transferguard`; that project was not modified. No eligibility or submission claim is made.

## Completed

- Inspected new project repo and local runtime; created Node 24 dependency-free service with built-in SQLite.
- Implemented exact money parsing, deterministic USD allocation, persistent per-Google-user records, Google OAuth login, Airwallex sandbox client, session-based HTTP routes, operator UI, revisions/approvals, timeout/reconcile flow, Docker unit and Playwright E2E setups.
- Read official Airwallex balance and transfer docs; adapter uses sandbox base URL. No credentials were present, so no API call occurred.
- Ran Docker test suite: final run 14/14 passed; syntax checks passed. See `test-report.md`.
- Added setup/demo notes, proof ledger and risk disclosures.

## Deliberately limited / outstanding

- No Airwallex sandbox credentials, permission test, account balance read, beneficiary confirmation, transfer mutation or independent read-back.
- Transfer create is fail-closed unless `/transfers/validate` returns `amount_payer_pays`; official docs do not identify validation as a quote. Confirm the exact sandbox behavior and fees before enabling any transfer claim.
- No FX, receipt ingestion, AI, multi-currency, multiple accounts, webhook, hosting, video or submission.
- Competition prior-work/pre-build/second-project rules and published judging rubric remain unresolved in public materials reviewed.

## Next work when access is available

1. Supply credentials locally in `.env` only; verify authentication and read-only USD balance.
2. Validate exact sandbox beneficiary and transfer route; record sanitized validation response and payer-cost semantics.
3. Only if payer cost is known before create, test one explicitly approved sandbox action and query status independently using transfer ID/request ID.
4. Extend negative tests for the confirmed provider contract, run Docker suite again, then rehearse clean setup and demo.
5. Update rubric-evidence matrix only from organizer-published criteria; prepare pitch/video based on actual tested behavior.
