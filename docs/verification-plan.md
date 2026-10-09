# Verification Plan and Results

## Executed

Command: `docker compose run --build --rm test` (Docker, Node 24 Alpine). The suite runs `node --test` against the real planner, money parser, SQLite store, and HTTP server with injected provider boundaries.

| Verification | Result | Scope |
|---|---|---|
| Exact cents and decimal rejection | Passed | Unit |
| Deterministic priority allocation/reserve invariant | Passed | Unit |
| Pending and forecast fields excluded from spendable input | Passed | Planner boundary only; no receipt workflow |
| Balance reduction changes action plan | Passed | Unit |
| Reserve floor and overdue escalation | Passed | Unit |
| USD-only/no-FX behavior | Passed | Unit |
| Invalid inputs and approval for non-PAY rejected | Passed | Unit |
| New obligation changes decision | Passed | Unit + HTTP stale-plan test |
| Authentication and CSRF negatives | Passed | HTTP |
| Stale balance and changed input prevent approval | Passed | HTTP |
| Timeout is OUTCOME_UNKNOWN; duplicate execution blocked | Passed | HTTP with injected adapter |
| SQLite restart and duplicate request ID | Passed | Persistence |

Latest recorded run: **14 tests, 14 passed, 0 failed, 0 skipped**. Adapter tests use stubbed HTTP responses and are not Airwallex sandbox evidence.

## Not executed / still required

- Real sandbox authentication and read-only balance retrieval.
- Live beneficiary validation, transfer fee behavior, sandbox create, timeout injection at provider boundary, query-by-request-ID behavior, and independent read-back.
- Provider balance change and status transition against the demo account.
- Browser visual/manual workflow, production security review, deployment, presentation/video capture, and submission.

The local sandbox credentials were absent. No test is described as a real provider result. Before any transfer, confirm API permissions, beneficiary, corridor and fee evidence. Execution currently blocks unless validation returns a usable payer-cost value that remains above reserve.
