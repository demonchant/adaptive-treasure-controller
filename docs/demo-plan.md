# Demo Plan

**Product workflow implemented; sandbox demo not yet verified.** This project has no fallback mock balance. The demo requires Airwallex sandbox credentials and an account with a USD cash balance. Synthetic/manual obligations must be identified as such.

## Setup

Use [`setup-guide.md`](setup-guide.md). Set credentials server-side, run Docker app, and do not show `.env` or secrets in screenshots/video. The Docker test suite is local logic evidence only.

## Target walkthrough (under five minutes)

1. Show actual sandbox badge and refresh current USD cash. Point out available vs pending amounts.
2. Enter synthetic obligations with priorities/due dates; calculate plan and reserve/headroom.
3. Add a high-priority obligation or refresh after a verified sandbox balance change. Recalculate; show the plan revision and changed pay/defer action. Explain that operator-entered obligations are not bank-observed liabilities.
4. Try approving the stale plan; show server rejection. Recalculate and approve the exact new action.
5. Only attempt execute if a real sandbox beneficiary is linked and provider validation returns a usable payer-cost value. If not, show honest fail-closed message—do not substitute a mock.
6. If create outcome is uncertain, reconcile the original request ID. Show resulting provider status as an observation and disclose that `PAID` may later transition.
7. Close with reserve race/fee limitations and no-live-provider-test status unless that changes.

## Claims to avoid

- Do not call obligations or incoming receipts Airwallex data; receipt ingestion is not implemented.
- Do not claim reserve is atomic against outside debits.
- Do not say a transfer was paid/settled unless provider read-back shows it; even `PAID` may not be immutable.
- Do not claim API integration is sandbox-proven until credentials, API permissions, a provider response and independent read-back are recorded.
- Do not claim submission, score, eligibility or winning status.

Video requirement observed on public FAQ: under five minutes. Repository/setup and demo requirements are documented in competition records; there is no deployed app, recorded video or submitted entry.
