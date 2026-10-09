# Hardest Promise

## Promise

**Given a fresh Airwallex sandbox USD cash balance and operator-entered obligations, compute a deterministic reserve-constrained plan, invalidate it when inputs change, bind human approval to one exact action, and persist/reconcile any provider operation without treating a timeout as failure.**

The local implementation exists and is covered by Docker tests. No Airwallex credentials were available, so live balance reads, transfer validation, creation, and read-back remain unverified. Execution fails closed if validation does not expose payer cost. The reserve is a preflight check, not an atomic hold: an external debit can race after the read. Pending/forecast receipt ingestion is not implemented; no forecast amount can be supplied as spendable planner liquidity. FX is excluded.

## Acceptance tests and current evidence

1. Decimal inputs become exact integer cents; invalid precision/sign is rejected — tested.
2. Deterministic priority/due ordering chooses only obligations fitting available minus reserve — tested.
3. Pending or forecast amounts do not increase plan liquidity — tested at planner boundary; no receipt ingestion UI exists.
4. Adding a critical obligation changes the previous decision — planner and HTTP tests cover recalculation/stale-plan invalidation.
5. A reduced available balance changes the computed plan — planner test; live provider balance change not tested.
6. A payment that would violate reserve is deferred/escalated and cannot be approved — planner constraint test.
7. Overdue unfunded obligation escalates without bypassing reserve — tested.
8. Any changed plan input makes the old plan stale and blocks approval — HTTP test.
9. Approval digest must match the exact plan/action — forged digest rejected in HTTP test.
10. Duplicate operation request IDs are rejected; a pending/unknown operation blocks re-execution — SQLite and HTTP tests.
11. Provider timeout is persisted as `OUTCOME_UNKNOWN`; retry waits for reconcile — injected failure HTTP test.
12. Persistent obligations/operations survive SQLite close/reopen — tested.
13. Provider response is queried by transfer ID/request ID for read-back — adapter/server are implemented, but no live read-back is verified.
14. A sandbox provider validation without known payer cost blocks create — enforced in server; live contract response not yet tested.

## Falsifiers and limits

The promise is false if invalid decimals are rounded silently, planner outflow crosses the reserve, a changed input preserves approval, or timeout permits a second provider create. Docker tests exercise these local controls, but cannot prove Airwallex account permissions, actual fees, corridor behavior, eventual status changes, or an independent sandbox read. The provider does not guarantee the app's reserve against concurrent external debits. Narrow claims to what live evidence proves; never present a sandbox action as production payment success.
