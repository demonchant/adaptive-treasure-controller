# Demo 2 voiceover

## Opening problem statement

Small teams often manage their cash balance, upcoming bills, and payment approvals in separate places. That makes a simple question hard to answer: what can we pay now without spending money reserved for essentials? Adaptive Treasury Controller brings that decision into one reviewable workflow.

## Narration

ATC is a decision-support workspace for manually entered obligations against Airwallex sandbox USD cash. It refreshes confirmed available balance. Pending funds are not counted. The protected reserve stays separate from cash available to allocate.

Operators enter each bill's amount, due date, priority, and optional beneficiary. A deterministic planner considers the configured fee cap and marks each item to pay, defer, or escalate.

Here, the visible thirty-dollar obligation reserves up to one dollar for the payer fee. When a balance or obligation changes, the previous plan is marked stale and must be recalculated.

Approval records the exact action. It does not move money. Execution is a separate sandbox step that requires a beneficiary and a fresh balance. ATC records provider status, detects unverified costs, and requires reconciliation before retries.

Each signed-in operator gets an isolated workspace. ATC addresses fragmented payment planning with a shared view of cash, obligations, reserve, human approval, and provider operation history. This video ends with planning and approval; it does not show a completed transfer. The app handles USD-only sandbox payouts, and operators remain responsible for accurate obligations and beneficiary details.
