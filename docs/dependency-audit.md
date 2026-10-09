# Dependency and Feasibility Audit

**Checked:** October 9, 2026. Planning-only; not a package audit. No dependencies installed.

| Dependency/capability | Role | Source/status | Credential/enablement | Failure/pivot |
|---|---|---|---|---|
| Airwallex sandbox authentication | Provider identity for server operations | Guide documents API-key login; not called | Builder-owned sandbox Client ID/API key; server-only | No valid auth means no live-provider claim; do not fake responses |
| Global Accounts / balances | Funded accounts and available liquidity | Guide/API docs linked; not called | Sandbox account and permissions | Cannot get fresh balance → stop provider workflow |
| Simulated deposit | Repeatable sandbox seed funding | Guide documents; not called | Sandbox Global Account | Mark simulated; never call it a real receipt |
| Beneficiary schema/validation | Valid corridor-specific payee | Guide documents; payload unverified | Sandbox API permission | Use only validated synthetic details; drop unsupported corridor |
| Transfers create/list | Consequential payment action and reconciliation | Guide/API reference; no action | Human approval; request ID; sandbox limits | Timeout→unknown; reconcile before retry; no blind resend |
| Transfer simulation endpoint | Repeatable status/failure demonstration | Guide documents; not called | Sandbox only | Label simulated; omit if unsafe/unavailable |
| FX quote/conversion (optional) | Compare/execute currency choice | Guide/API refs; no proof | Fees, quote freshness, precision and corridor validation | Exclude FX if any key contract cannot be verified |
| Durable storage | Plan revisions, approvals and provider-operation record | Architecture proposal | Local DB later | Persist/transaction/restart tests; no frontend-only workflow |
| AI model (optional) | Extract obligations/receipt evidence or explain | No model selected or needed yet | Server credentials if later selected | Omit if no measurable accuracy/value or safe boundary |
| Hosting/deployment | Reviewer access | Not selected; requirement unknown | Separate service credentials later | Keep local reproducible path unless rules require deployment |
| Existing TransferGuard repo | Separate project context only | Git status inspected; contents/secrets not inspected | Its `.env` was not read and must not be used | Keep code/history/credentials fully separate |

Official Airwallex endpoints, scopes, schemas, currency support, fees and terminal states are unverified for any account. See `competition-rules.md` and `architecture.md` for endpoint references and precise open questions.
