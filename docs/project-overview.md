# Project overview

## Problem

Small teams can have their account balance, payment obligations, and approvals spread across different tools. A balance may change after someone reviews it, pending receipts may be mistaken for spendable cash, or several individually reasonable payments may collectively cross a minimum cash reserve. This leaves operators without a clear, reviewable answer to: “What can we safely pay now?”

## What ATC does

Adaptive Treasury Controller (ATC) is a decision-support workspace for manually entered USD obligations against an Airwallex sandbox USD cash balance. It makes the available cash, protected reserve, payment plan, and human approvals visible in one workflow.

1. Google sign-in creates an isolated workspace for each user.
2. ATC fetches the current Airwallex cash balance. Pending funds are displayed but excluded from spendable cash.
3. An operator records an obligation with a name, amount, due date, priority, and optional Airwallex beneficiary ID.
4. The deterministic planner orders open obligations by priority and due date, then marks each `PAY`, `DEFER`, or `ESCALATE` while preserving the reserve.
5. A configured per-transfer maximum payer fee is added to each proposed payment before the planner allocates headroom.
6. The operator approves the exact plan action. Any material input or balance change makes the plan stale and requires recalculation and a new approval.
7. Execution is a separate explicit action. ATC refreshes the balance, validates the payout request, then submits it to the Airwallex sandbox using payer-pays fees.
8. ATC stores a redacted provider response and operation status. Unknown results, missing payer-cost data, or a payer cost outside the approved ceiling require reconciliation before retrying.

## What it solves

ATC turns a scattered cash-and-bills review into an explainable allocation decision. The reserve floor, fee ceiling, freshness checks, exact approval record, and provider-operation history help an operator see why an obligation can proceed and what must happen next.

## Scope and limits

- Sandbox transfers only; the app is not a production treasury or accounting system.
- USD obligations and USD cash only; no FX optimization.
- Obligations and beneficiary IDs are entered by an operator; ATC does not discover invoices or beneficiaries.
- User workspaces isolate obligations, approvals, and operations. They share the configured Airwallex account balance.
- The configured fee ceiling must come from the Airwallex account's actual fee schedule and payout route. Leave it unset until verified; approvals and execution remain disabled.
- Airwallex's validation endpoint does not quote the final payer cost. That cost is checked in the create response, so a provider result above the configured ceiling is flagged for reconciliation after submission.
- A provider status is a point-in-time report and is not a guarantee of final settlement.
- Operators are responsible for confirming beneficiary details, obligation data, fee settings, and approvals.

## Demo materials

- [Demo 2 video](../demo/2.mp4)
- [Narration script](demo-voiceover.md)
- [Test and check results](test-results.md)
