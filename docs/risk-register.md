# Risk Register

**Updated:** October 9, 2026. Ratings are qualitative engineering assessments, not official scoring.

| Risk | Impact | Mitigation / evidence | Status |
|---|---|---|---|
| Pre-build/previous-code or second-project rules disqualify entry | Disqualification | Public rules did not resolve; project remains separate and TransferGuard untouched | UNCONFIRMED |
| Unknown official rubric | Competitive misalignment | Do not invent scoring criteria; keep official matrix explicit | UNCONFIRMED |
| No Airwallex sandbox account/credentials | Cannot verify sponsor workflow | Adapter uses sandbox host; no API calls claimed; provide local credentials and run feasibility tests | BLOCKED ON ACCESS |
| Transfer validation is not fee quote | Reserve breach / unsafe create | Fail closed unless validation returns payer cost; official docs describe validation as field validation | SAFETY GATE ACTIVE |
| External debit after balance preflight | Provider may debit below app reserve | Fresh preflight and stop if balance changed; app cannot atomically hold reserve | RESIDUAL RISK |
| Planner too simple for global optimum | Suboptimal treasury choice | Transparent priority/due/penalty greedy; USD-only; do not claim optimality | DISCLOSED |
| Unsupported provider status / delayed result | Incorrect success label or duplicate payment | Unknown states reconcile by ID/request ID; `PAID` is observed, not immutable | IMPLEMENTED LOCALLY; LIVE UNVERIFIED |
| Session loss after restart | Visitor must sign in again | Google OAuth session held in memory; each visitor's business state is in a separate persistent SQLite file | DISCLOSED |
| Pending/forecast receipt confusion | Unsafe cash decision | Only `available_amount` enters planner; no receipt ingestion; pending not spendable | TESTED AT PLANNER BOUNDARY |
| Synthetic/live confusion | Misleading demo claim | Explicit manual obligations, no fake balance fallback, clear setup/demo disclosures | IMPLEMENTED |
| Secrets leak | Account compromise | Server-only environment variables, `.env` and Docker ignore; no secrets checked in | MITIGATED; HUMAN SECRET HYGIENE REQUIRED |
| Shared Airwallex account across user workspaces | Visitors can compete for the same sandbox funds and all transfers use the server's one scoped key | Separate Google identities and SQLite workspaces; single-instance transfer lock and fresh provider balance preflight; separate provider accounts are not provisioned per visitor | DISCLOSED |
| Public auth misconfiguration | Users cannot sign in or identities could be misrouted | Google OAuth issuer, audience, nonce, PKCE and verified-email checks; exact HTTPS callback URI required | IMPLEMENTED; DEPLOY CONFIG REQUIRED |
