# Build Log

## 2026-10-09 — Research and eligibility gate

- Created a separate Git repository for Adaptive Treasury Controller; did not modify `transferguard`.
- Reviewed official Airwallex event page, accessible HackerEarth challenge overview, Airwallex builder guide, and the complete local `HACKATHON_BUILD_STANDARD_V2.md`.
- Confirmed published UTC phase schedule, event FAQ deliverables and Kit 01 alignment. Judging weights, pre-build restrictions, prior-code eligibility and permission for a second project remain unconfirmed.
- Compared three concepts. Selected Liquidity Crisis Response Agent as the narrow first slice of Treasury & Ops Kit 01 because its planning score was strongest (46/50); this is not an official score or a passed go gate.
- Recorded hardest promise, architecture, verification requirements, dependency risks and claim-proof ledger.
- No product code, package install, tests, sandbox request, deployment, organizer contact or submission occurred. Do not infer any of these from this planning milestone.
- Next gate: get written answers to rules questions; confirm registration/acceptance; builder independently configures Airwallex sandbox access; run a documented feasibility spike after permitted.

## 2026-10-09 — Phase 2 architecture/proof specification

- Rechecked current Airwallex API references for current balances and transfers. Documented available vs pending/reserved, request-ID-based transfer lookup and 7-day duplicate protection; account-specific access and state remain untested.
- Narrowed first slice to USD same-currency LOCAL transfer, no FX/AI. Added explicit greedy objective, exact-cent hand calculation, schema/data model, separate plan/approval/operation states, API call plan, threat model and negative-path acceptance criteria.
- Added a synthetic worked scenario in `docs/vertical-slice-proof.md`; it is a desk-check/specification, not executed code or functional proof. Forecast receipts remain excluded from spendable cash; the decision-change event is a new high-priority obligation.
- Added external-balance race limitation: app preflight cannot atomically protect against a third-party debit unless provider/account controls support it. Promise is limited to blocking this app's own stale/unsafe actions and detecting changes.
- The user instructed the agent to proceed despite unresolved event guidance; work continued in this separate repository only. Do not treat that instruction as an organizer ruling.

## 2026-10-09 — Vertical slice and verification

- Implemented USD-only deterministic planner, exact cents, persistent SQLite records, server-side Airwallex sandbox adapter, authenticated operator workflow, approval revisions, UI, Docker files and setup/demo docs.
- Guarded transfer execution on fresh balance, current plan/approval and provider-disclosed payer cost. The current API docs describe transfer validation as field validation, not a fee quote, so a successful transfer cannot be claimed until sandbox response semantics are confirmed.
- Final Docker suite run after auth config update: 14 tests passed, 0 failed; JS syntax checks passed. Tests use injected provider adapters; no real Airwallex request/transfer is implied.
- Container smoke checks: UI HTTP 200, session HTTP 200, disposable-password login HTTP 200. Found and fixed a container loopback-bind issue; Compose now binds the process inside the container while publishing only on host loopback. Temporary container stopped.
- No sandbox credentials were available; no Airwallex API read, transfer, deployment, submission, organizer response or judging score is claimed. TransferGuard was not modified.
