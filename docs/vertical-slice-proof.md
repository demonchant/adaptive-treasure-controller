# Vertical Slice Proof Specification

**Status:** hand-checked specification only. This is not executable proof or a test result. Implementation and sandbox execution remain gated by eligibility/build rules and credentials. Amounts below are synthetic scenario inputs, not Airwallex account values.

## Narrowest end-to-end promise

Read a real, timestamped Airwallex USD cash `available_amount`; keep `pending_amount` and `reserved_amount` out of spendable funds; plan a deterministic pay/defer choice above a protected reserve; accept new critical obligation information; recalculate and invalidate stale approval; require approval for exact revised transfer; create one sandbox transfer; then retrieve the provider transfer and fresh balance independently.

No AI, FX, multi-currency optimization, automatic payment, webhook, or production action is needed to prove this slice. Synthetic obligation records and the new-obligation event are labeled in the demo. Airwallex data/actions remain real sandbox responses.

## Fixed scenario and arithmetic

Currency: USD only; scale: 2 digits. All values in this fixture are exact cents in domain logic.

Initial provider response (fixture expectation, not a claimed live response):

| Field | Provider value | Domain value | Spendable? |
|---|---:|---:|---|
| `available_amount` | 130.00 USD | 13,000 cents | Yes |
| `pending_amount` | 20.00 USD | 2,000 cents | No |
| `reserved_amount` | 10.00 USD | 1,000 cents | No; already not available |
| Application reserve floor | 30.00 USD | 3,000 cents | Protected |

Spendable headroom is `max(0, available - reserveFloor) = 13,000 - 3,000 = 10,000 cents`. Do **not** compute `total_amount - reserve`, add pending, or subtract Airwallex `reserved_amount` a second time from `available_amount`.

Initial synthetic obligations:

| ID | Amount (USD) | Priority | Due order | State |
|---|---:|---|---|---|
| B | 70.00 | HIGH | Earlier | OPEN |
| C | 30.00 | NORMAL | Later | OPEN |

An additional expected receipt forecast of 50.00 USD may be present, labeled `EXPECTED` and synthetic. It is not included in the current balance/headroom. Marking it `DELAYED` updates forecast status but does not increase or decrease current spendable cash and does not by itself change an executable current plan. If the receipt would otherwise support a future conditional schedule, that branch is removed/revised and requires a fresh balance read after settlement.

Initial deterministic result: B and C are both eligible, total cost 10,000 cents; remaining available 3,000 cents equals reserve floor. Plan revision 1: `PAY B`, `PAY C`, no breach.

New input: synthetic, operator-entered, critical obligation A for 40.00 USD, due immediately. This input changes priority order, not provider balance. Planner revision 2 sorts A before B before C: select A (4,000 cents, leaves 6,000); B (7,000) does not fit and is DEFERRED; C (3,000) fits and is selected. Result: `PAY A`, `DEFER B`, `PAY C`; total 7,000 cents, remaining spendable balance after the planned actions 6,000 cents, above the 3,000 reserve. Revision 1 approvals are invalid.

Approval binds only A's 4,000-cent action (beneficiary, USD, route, displayed provider-calculated/known fee assumption, plan revision 2, input hash and operator). On sandbox execution, compare the returned `amount_payer_pays` to the approved cost; if the exact cost cannot be known safely before the side effect, do not execute. For verified no-fee USD LOCAL route, expected available balance after settled transfer is 9,000 cents and the next headroom is 6,000 cents; actual values must come from fresh provider read-back, not this expected fixture. C remains payable under the illustrative policy, while B remains deferred.

This scenario proves plan invalidation/reprioritization and an approval-bound provider action if implemented and observed. It does **not** prove that an incoming forecast was received or delayed, that Airwallex generated the new obligation, or that a transfer was paid unless provider evidence confirms it.

## Planner contract

Input is immutable snapshot `{planRevision, providerBalanceSnapshotId, availableMinor, currency, reserveMinor, obligations[]}`. Only OPEN obligations in the same supported currency and with known beneficiary/estimated maximum payer cost may be planned. Forecast cash is a separate record and never changes `availableMinor`.

Sort OPEN obligations by explicit priority (`CRITICAL > HIGH > NORMAL`), then earliest due timestamp, then largest declared non-payment penalty, then stable obligation ID. Walk in that order. Select an obligation if its maximum payer cost is no greater than remaining headroom; otherwise classify it `DEFERRED_RESERVE` or `DEFERRED_BUDGET`, and continue so smaller lower-priority items can fit. This is a deterministic greedy policy, **not a claim of globally optimal allocation**. The explanation records ordering fields, cost, headroom before/after and reason code. Operator policy changes create a new revision.

Execution is never inferred from a plan. Each payment action is a separately approved operation; immediately before submission refresh balance, verify snapshot freshness/revision, recompute all constraints and reject stale approval. The provider operation creates a new state; never subtract a planned (not yet settled) transfer twice. After create, reconcile the transfer by provider ID/request ID and refresh balances before any subsequent action.

## Acceptance tests against this fixture

1. Parse USD values to exact cents; reject >2 fractional digits, negative values, NaN/infinity, exponent/malformed text, overflow beyond safe integer bounds.
2. Initial available is 13,000; pending/reserved are ignored as additional spendable cash; headroom is 10,000.
3. Revision 1 selects B+C; total 10,000, remaining 3,000; invariant holds exactly at reserve boundary.
4. Insert A and recompute revision 2; selects A+C and defers B; total 7,000 and remaining 6,000.
5. Revision 1 approval is rejected after revision 2 exists; no provider call is made.
6. Lower available balance below reserve yields zero payable headroom; every positive obligation is deferred; no negative headroom.
7. Any provider fee not known/bounded before execution blocks approval/creation; simulated/unknown fee cannot silently be assumed zero.
8. Failed/unavailable balance read, stale snapshot or currency mismatch fails closed.
9. An authorized approval for A creates one provider request ID; a double click/concurrent request returns the same local operation and causes no second provider create.
10. Inject timeout after the provider may have accepted: persisted state becomes `OUTCOME_UNKNOWN`; GET/list by the same `request_id` reconciles; no new request ID/payment is issued.
11. Provider transfer ID read-back matches operation ID, beneficiary, transfer currency, amount and status; independent balance read is persisted. Only the configured terminal status can become verified.
12. Restart before/after provider call preserves approval, operation ID, request ID, revision, and unknown state.
13. Unauthorized approval, changed beneficiary, amount, currency, route, fee, or input hash is rejected server-side.
14. Adding/delaying a 50.00 forecast never changes current available/headroom; it changes only forecast state and any explicitly conditional future branch. No action may rely on it until a fresh provider balance proves settlement.

## Proof bar

The table above is a reasoning fixture only. It becomes a passing proof only after the same planner implementation is tested, a sandbox call is made from this app, provider request/transfer IDs are recorded, and a separate Airwallex retrieval/balance read confirms the postcondition. No such execution has occurred yet.
