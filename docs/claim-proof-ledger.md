# Claim-to-Proof Ledger

**Snapshot:** October 9, 2026. Docker automated tests: 14 passed, 0 failed. Adapter tests use stubs. No Airwallex credentials/API request, deployment, competition submission, or live provider outcome is verified.

| Exact claim | Implementation | Test/evidence | Status | Limitation |
|---|---|---|---|---|
| Exact cents and deterministic reserve-constrained allocation | `lib/money.mjs`, `lib/planner.mjs` | Docker money/planner tests | Locally tested | USD-only greedy policy; not globally optimal |
| New obligation changes plan and invalidates stale approval | `server.mjs` input hashes and plan revisions | Docker HTTP stale-input/replan test | Locally tested | No live provider balance-change scenario |
| Pending/forecast values are not spendable | Planner consumes only `availableCents`; provider adapter selects `available_amount` | Planner boundary test; official contract reviewed | Partially tested | Receipt ingestion not implemented |
| Signed-in visitors have separate workspace records | Google OIDC verified subject selects a hashed per-user SQLite file | Alice/Bob browser isolation is covered by Playwright | E2E test pending container run | Airwallex balance/key remains one shared sandbox account |
| Operator approval precedes transfer creation | `/api/approve`, action digest, `/api/execute` | Forged digest and missing CSRF rejected | Docker HTTP tests | Each user approves within their own workspace |
| Timeout is unknown and requires reconciliation | Durable operation table, original request ID query | Injected timeout persists `OUTCOME_UNKNOWN`; duplicate blocked | Tested with injected adapter | No live timeout fault injected into Airwallex |
| Airwallex balance/transfer APIs are the actual integration | `lib/airwallex.mjs` uses sandbox hostname/API paths | Official API contract reviewed | Implemented, not live-verified | Credentials/scopes/corridor absent |
| Result can be read back independently | Retrieve transfer by ID or list by original request ID | Code path exists; no actual provider response | Not verified | Provider states may later change; `PAID` is displayed as observed |
| FX fee optimization or receipt-delay ingestion | Not implemented | No code or test | Not claimed | Excluded intentionally |

All Docker tests use injected adapters and temporary SQLite. Those fixtures are not Airwallex evidence. The app has no fake-balance fallback. Never present synthetic obligations or injected test provider results as live data. A sandbox payment is not proof of real-world payment success.
