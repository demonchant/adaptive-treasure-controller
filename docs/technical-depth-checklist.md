# Technical Depth Checklist

**Status:** proposed; no implementation paths or proofs exist yet. This mirrors Build Standard Appendix B.

| Area | Planned answer | Evidence/code path | Status |
|---|---|---|---|
| User outcome | Safe pay/defer/escalate choice after liquidity shock | E2E plan and provider reconciliation | PLANNED |
| Core mechanism | Deterministic reserve-constrained replan | Pure domain planner + invariant tests | PLANNED |
| State | Versioned obligations/plans/approvals/provider operations | Persistent schema + transition tests | PLANNED |
| Data quality | Provider source, timestamp/freshness, forecast separation | Snapshot validation tests | PLANNED |
| AI | Optional extraction/explanation only | Schema, semantic validation, no action authority | OPTIONAL / NOT BUILT |
| Evaluation | Labeled extraction fixtures only if AI retained | Counts, categories, errors, limitations | NOT STARTED |
| Integration | Airwallex balance, beneficiary, transfer; optional FX | Current API + empirical sandbox truth table | DOCUMENTED ONLY |
| Sponsor fit | Balance and provider action change core outcome | Disable integration test changes behavior/fails safely | NOT VERIFIED |
| Privileges | Server-only keys, sandbox boundary, explicit approval | Security tests and config review | PLANNED |
| Idempotency | Provider request ID + local unique action lock | Duplicate and retry tests | PLANNED |
| Concurrency | Plan revision check and transaction/locking | Stale and concurrent approval tests | PLANNED |
| Partial failure | Separate operation state; reconcile each provider action | Fault-injection tests | PLANNED |
| Recovery | Durable state; outcome-unknown stays unresolved | Restart/reconciliation tests | PLANNED |
| Degraded mode | No fresh provider data means safe hold, not “all clear” | Offline/stale integration tests | PLANNED |
| Verification | Independent provider read-back | Sanitized provider evidence + exact IDs | NOT VERIFIED |
| Security | Authz, untrusted docs, prompt injection, secrets | Threat tests/review | PLANNED |
| Observability | Mode, source age, operation ID, failure reason; no secrets | Operator UI/log redaction | PLANNED |
| Deployment | Repeatable setup/health/rollback if deployment required | Runbook + cold start | UNKNOWN |
| Evidence | Reproducible labeled scenario and source provenance | Build log/claim ledger/demo | PLANNED |
| Reviewer path | Fast setup or deployment with no hidden state | Timed cold demo | PLANNED |

## Load-bearing test

Disable Airwallex balance/transfer access and repeat the same workflow from a fresh process. Expected behavior: it cannot produce a live-looking provider result or approve a stale plan; it visibly holds and identifies the missing dependency. Add a regression test once the integration exists.
