# Architecture

**Status (October 9, 2026):** local USD-only planning workflow, sandbox API adapter, Google OAuth identity, per-user workspaces, and Docker/Playwright workflows are implemented. Airwallex credentials are now configured locally, but no live API call or sandbox outcome has been verified. Event eligibility/pre-build compliance remains unconfirmed.

## Implemented versus intended

Implemented: integer-cent deterministic planner; SQLite snapshots, obligations, plan revisions, approvals, provider operations and audit rows; server-side Airwallex sandbox auth/balance/transfer client; Google OAuth with nonce, PKCE, verified email, and per-user hashed database files; CSRF/origin checks; reserve and freshness checks; fail-closed payer-cost validation; timeout persistence and request-ID reconciliation; browser UI. FX, AI, receipt ingestion, webhooks and production are intentionally excluded. A stale balance or changed obligation blocks approval/execute. Human approval precedes any create request.

Provider transfer execution is currently gated more strictly than ordinary field validation: `POST /transfers/validate` must return a usable `amount_payer_pays` field and its value must fit above reserve. The official docs do not describe validation as a fee quote; therefore execution remains unavailable unless the sandbox response actually provides verified payer-cost evidence. Never interpret a field-validation success alone as a cost quote.

The reservation guarantee covers only this app's checks at preflight. It cannot atomically prevent external debits after the balance read. Provider `PAID` is stored as an observed state and is not treated as immutable terminal proof.

## Product boundary and dataflow

Support a treasury operator choosing which obligations to pay, defer or escalate when cash is constrained. Airwallex sandbox supplies balances and executes approved transfers (optionally FX). Changed inputs must change a deterministic decision; provider outcomes must be independently verified. Not a generic dashboard, production banking system or real-money tool.

```text
Airwallex balance + labeled synthetic obligations/receipt event
→ timestamped/source-labeled snapshot persisted
→ deterministic planner creates revision under reserve and priority constraints
→ optional AI extracts document fields or explains trade-offs (untrusted input)
→ server validates schema, freshness, amount, beneficiary and revision
→ human approves exact action details
→ fresh balance/policy revalidation
→ sandbox transfer and optional quote/conversion
→ provider result and IDs persisted
→ independent provider query/read-back
→ verified, pending, returned, partial or outcome-unknown shown
```

## Deterministic financial decision

1. Spend only from a fresh provider balance; forecast inflows remain separate.
2. Represent amounts exactly per currency. Validate precision and rounding against verified Airwallex contracts. Compare currencies only with a fresh explicit quote, fees and terms; stale/missing rate blocks conversion.
3. Compute obligation cash cost including verified fees; reject invalid amounts, unknown beneficiaries/corridors and unsupported/stale operations.
4. Choose feasible actions under available funds minus protected reserve using explicit operator-configured priority, deadline and non-payment impact. Define objective/tie-breakers before coding; do not use AI to choose fuzzy priorities.
5. Explain paid/blocked choices with binding constraints and consequences. If no complete plan fits, defer/escalate rather than cross reserve.
6. Changed balance, obligation, quote/fee, deadline or receipt creates new revision and invalidates affected approvals.

The implemented vertical slice is **USD-only, same-currency LOCAL adapter, no FX**. Internally it uses integer cents after parsing decimal amounts. The planner sorts by priority (CRITICAL, HIGH, NORMAL), due time, penalty descending, then stable ID. It walks that order, pays an obligation if its principal amount fits current headroom, otherwise defers/escalates and continues. This is an explicit greedy policy, not a global optimum. Since no fee cap is available to the planner, server execution is stricter: it blocks unless provider validation returns a payer cost that fits headroom. This condition is not sandbox-verified. The hand-checkable inputs/outputs are in `vertical-slice-proof.md`.

Use provider `available_amount` for cash headroom; pending is unavailable. Airwallex `reserved_amount` is part of its balance breakdown and should not be subtracted again from `available_amount`. App reserve is `max(0, available_minor - reserve_floor_minor)`. A provider snapshot cannot guarantee the balance will not change externally between read and transfer: the first slice guarantees only that this app will not initiate a transfer when its latest preflight violates the configured floor. A concurrent external debit can still reduce funds; the system must detect it, stop further actions and disclose the limitation. A dedicated sandbox account reduces this risk but does not convert the client-side floor into a provider-enforced hold.

The implementation does not store a known maximum payer cost in a plan. `POST /transfers/validate` checks fields but the documentation does not describe it as a fee quote. Transfer create returns `amount_payer_pays` and fee fields; because that is post-create, never use an unknown fee as though it were a safe preflight. This build blocks execution unless the validation response itself contains payer-cost evidence; actual response semantics must be checked before calling a transfer executable.

No FX/cross-currency arithmetic is included in the first slice. A later FX feature needs quote currency pair, rate, expiry/single-use behavior, fees, rounding and provider settlement modeled explicitly; any stale/missing quote blocks execution.

## State and persistence

Separate state machines prevent a plan from being mistaken for a payment. **Plan:** `CREATED → CURRENT → SUPERSEDED | INVALIDATED`; **approval:** `PENDING → APPROVED | REJECTED | EXPIRED | STALE → CONSUMED`; **operation:** `READY → SUBMITTING → OUTCOME_UNKNOWN | PROVIDER_KNOWN_PENDING | PROVIDER_TERMINAL_SUCCESS | PROVIDER_TERMINAL_FAILURE | RECONCILIATION_REQUIRED`. Transitions into terminal states require a retrieved provider state mapped using current Airwallex documentation. Never equate `CANCELLED` with a user cancellation or generic failure. A timeout is `OUTCOME_UNKNOWN`, not failed. On unknown, query `GET /transfers/{id}` if provider ID known, otherwise `GET /transfers?request_id=...`; use the same request ID for that operation, and create no replacement until the result is resolved. Do not rely on a generic retry status map before sandbox testing.

Any material input update marks the current plan superseded and pending approvals stale in one DB transaction. Approval transition is compare-and-swap on plan revision and exact action digest. Operation creation uses unique `approval_id` and `request_id` constraints. A single operator approval can authorize one specific transfer; edits require a new approval. A pending/unknown operation is reconciled before any second dependent payment.

Persist obligation/source, provider snapshot/time, input hash, plan revision/rationale, approval actor/subject, provider request/transfer/conversion IDs, sanitized response evidence, status changes, timestamps and verification. Use transactional writes, unique logical-action key and optimistic revision checks to prevent duplicate/stale execution. Define retention and secret redaction before implementation.

## Proposed data model

All timestamps are UTC ISO-8601; every provider amount includes currency and explicit source timestamp. First-slice currency allowlist is USD. Monetary API JSON numbers must be parsed losslessly at the HTTP boundary, checked to supported currency precision and range, then converted to integer minor units. Reject rather than round unsupported precision. Serialize API request amounts only if the minor-unit integer is within the provider/client safe numeric limit; preserve canonical decimal strings in local state.

| Entity | Key fields / constraints |
|---|---|
| `provider_account` | local ID, Airwallex account reference (non-secret), allowed currency, environment=`sandbox`; unique provider/environment/account |
| `balance_snapshot` | ID, account ID, `available_minor`, `pending_minor`, `reserved_minor`, currency, `retrieved_at`, provider response hash; immutable; index account+retrieved_at |
| `reserve_policy` | ID/version, currency, floor_minor, freshness threshold, per-action/max-day caps; edits version policy and invalidate plans |
| `obligation` | ID, display label, beneficiary provider ID, amount_minor, currency, known max payer cost, due_at, priority, penalty_minor, provenance/source label, status, version; only validated synthetic payees in MVP |
| `receipt_forecast` | ID, amount_minor, currency, expected_at, confidence, source/provenance, state=`EXPECTED/DELAYED/SETTLED/REJECTED`; excluded from available cash until provider balance proves settled |
| `plan_revision` | ID, monotonic revision, snapshot ID, reserve-policy version, normalized-input hash, algorithm version, decisions/reasons, created_at, status; immutable after commit |
| `approval` | ID, plan revision, action digest, obligation/beneficiary, amount/currency/fee cap, actor/session, decision, time, expiry; unique action nonce; stale when inputs change |
| `provider_operation` | ID, approval ID unique, operation type, request_id unique per provider account, payload hash, provider transfer ID, current local state, last retrieved provider state, attempts, timestamps |
| `audit_event` | ID, actor, entity/type, before/after version refs, source, event timestamp, safe metadata; append-only at application layer |

Never persist API key or bearer token in these business tables. Store only the minimum beneficiary reference needed for the demo; protect details and redact evidence/logs.

## State transition rules

| Transition | Allowed when | Rejected cases |
|---|---|---|
| plan `CREATED → CURRENT` | Snapshot fresh, all inputs validated, planner completes | Missing/unsupported currency, stale/contradictory provider state |
| current plan `→ SUPERSEDED` | Any plan-affecting event committed | Must not edit old decision in place |
| approval `PENDING → APPROVED` | Authenticated actor approves exact current action digest | Wrong actor, expired/stale revision, changed payee/amount/fees |
| approval `APPROVED → CONSUMED` | Atomic unique operation record created | Duplicate approval submission or reserve recheck failure |
| operation `READY → SUBMITTING` | Fresh balance, same revision, action digest and reserve revalidated | Stale snapshot, floor breach, unknown fee, unauthorized actor |
| `SUBMITTING → OUTCOME_UNKNOWN` | Timeout/connection loss where provider acceptance is uncertain | Never map timeout to failed |
| unknown/pending `→ RECONCILIATION_REQUIRED` | Authenticated provider query unavailable/ambiguous | No blind second create |
| unknown/pending `→ provider state` | Transfer fetched by provider ID/request ID and state mapped | Create response alone is not terminal verification |

## Threat model

| Threat/asset | Attack or failure | Controls and evidence |
|---|---|---|
| API credentials | Leak via browser bundle, logs, Git, model, demo | Server-only env; deny client exposure; log redaction; secret scan; rotate if exposed |
| Payment authority | Client edits beneficiary/amount/currency or calls route directly | Server recomputes and validates; allowlisted provider payee; narrow schema; authenticated/authorized approval bound to digest |
| Stale approval | Balance, obligation or policy changes after plan/approval | Monotonic revision, stale approval invalidation, fresh preflight, transactional compare-and-swap |
| External balance race | Another debit occurs after preflight | Dedicated sandbox account; serialize app actions; re-read immediately before create; detect after; disclose no atomic provider reserve guarantee |
| Duplicate payment | Double click, retry, concurrent request, process restart | Unique local operation per approval; stable provider request ID; reconcile via provider GET/filter on timeout; regression test parallel retries |
| Malicious/incorrect payee | Beneficiary substitution or fabricated bank detail | Builder-approved synthetic beneficiary; validate schema and beneficiary; bind provider beneficiary ID/details fingerprint to approval |
| Provider/API failure | 429/5xx, timeout, status delay, inconsistent responses | Bounded backoff for reads; no blind write retry; persist unknown; reconcile; safe hold |
| Webhook forgery/replay | Spoofed or duplicated event changes operation state | No webhooks in MVP; if added, raw-body HMAC verification, event-ID dedupe, replay/freshness controls |
| Prompt injection / wrong AI output | Malicious invoice instructions influence payment | No AI in proof slice; if added, treat text as data, structured extraction only, no privileged tools, validate deterministic fields |
| App/DB privilege abuse | CSRF, unauthorized approval, concurrent mutation | Google identity session, CSRF/origin checks, per-user SQLite files keyed by a hash of the verified subject, approval bound to the current plan, local operation lock and SQLite uniqueness constraints; sessions are in memory and expire on restart |
| Synthetic/live confusion | Replayed fixture shown as actual provider event | Persistent source/mode labels on every record, visible UI labels, evidence and demo review |
| Sandbox overspend | Malicious/repeated tests consume funds | Sandbox-only hard environment flag, per-action and daily caps, human confirmation, rate limiting |

## API integration plan

| Purpose | Current documented endpoint | Contract / safe use |
|---|---|---|
| Auth | `POST /api/v1/authentication/login` | `x-client-id` / `x-api-key`; token kept server-side, expires in 30 min per guide |
| Account discovery/funding | `GET /api/v1/global_accounts`; optional create; `POST /api/v1/simulation/deposit/create` | Only for sandbox setup; deposits/events explicitly simulated |
| Balance source | `GET /api/v1/balances/current` | Read `account_type=cash`, currency, available/pending/reserved separately; only `available_amount` enters planner |
| Beneficiary contract | `POST /api/v1/beneficiaries/schema`, `/validate`, `/create` | Schema is corridor-specific; only synthetic, validated LOCAL beneficiary |
| Transfer prevalidation | `POST /api/v1/transfers/validate` | Validates fields and returns `OK` if no validation errors; not a fee quote or payment |
| Execute approved action | `POST /api/v1/transfers/create` | Mandatory unique `request_id`, `reason`, `reference`, `transfer_currency`, `transfer_amount`; capture returned `amount_payer_pays`, fee, transfer ID and status |
| Independent reconcile | `GET /api/v1/transfers/{id}` or `GET /api/v1/transfers?request_id=...` | Authenticated read; request_id filter is documented. Airwallex documents 7-day duplicate protection and recommends lookup with the same request ID after an uncertain create. Map status only against current docs; create response is not terminal proof |
| Scenario state change | `POST /api/v1/simulation/transfers/{id}/transition` | Optional sandbox-only simulation; disclose as simulation; test exact supported transitions |
| FX (later only) | rates, quotes, conversions | Excluded from slice; quote single-use and execution semantics/fees require separate proof |

Current official docs distinguish available, pending and reserved balances; `available_amount` is the spendable cash field and includes only processed deposits. Transfer creation returns payer/beneficiary amounts and fee; `POST /transfers/validate` is field validation only. A transfer request ID has seven-day duplicate protection, can be queried after uncertain create, and is reused only for that same operation. The transfer API's native approval-submission feature is available upon request; this proposal does not depend on it because app-side approval occurs before create. See `competition-rules.md` for source links. **Documented is not the same as feasible in this sandbox account:** actual scopes, corridor/fee behavior and state transitions remain untested.

## Airwallex dependencies (documented, unverified)

The builder guide lists these Kit 01 pathways; confirm exact payloads/permissions against current API reference:

- `POST /api/v1/authentication/login` — server-only client ID/API key token.
- `GET /api/v1/global_accounts`; optional `POST /api/v1/global_accounts/create`; `POST /api/v1/simulation/deposit/create` to fund sandbox.
- `GET /api/v1/balances/current` — wallet liquidity.
- `POST /api/v1/beneficiaries/schema`, `/beneficiaries/validate`, `/beneficiaries/create` — synthetic beneficiary.
- Optional `POST /api/v1/fx/quotes/create` and `/fx/conversions/create` — omit unless proven.
- `POST /api/v1/transfers/create`; `GET /api/v1/transfers` — sandbox payout/reconciliation.
- `POST /api/v1/simulation/transfers/{id}/transition` — only if needed for repeatable finality; visibly label simulation.

Official guide: https://airwallexdev.com/guide. API references: https://www.airwallex.com/docs/api/core_resources/balances/current; https://www.airwallex.com/docs/api/core_resources/global_accounts/list; https://www.airwallex.com/docs/api/payouts/transfers/create; https://www.airwallex.com/docs/api/transactional_fx/quotes/create; https://www.airwallex.com/docs/api/transactional_fx/conversion/create. Exact schemas, scopes, state semantics, fees and account permissions are not verified.

## Security and authority

- Keys/tokens server-side in ignored local env or secret manager; never browser/model/log/Git/video.
- Give model only narrow typed operations, never unrestricted credentials. Model cannot select arbitrary beneficiary/amount, approve, change policy or invoke a transfer/FX action.
- Human approval is explicit/revision-bound; fresh state and policy checked immediately before action.
- Authenticate/authorize operator server-side; validate input and protect state-changing browser routes from CSRF/replay.
- If using webhooks, verify HMAC on raw body and deduplicate event ID; otherwise poll/read state with visible consistency limits.

## Limits

No account, API call, quote, transfer, webhook or sandbox read-back has been verified. Currency corridors, payloads/statuses/scopes need proof. Sandbox only; scenarios may be synthetic and labeled. No production readiness, live money movement, deployment or completed submission is claimed.
