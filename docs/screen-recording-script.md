# Screen recording and voice-over script

**Hosted URL:** https://adaptive-treasury-controller.onrender.com/
**Status:** ready to record. The user reports that hosted Google sign-in works. Target length: about 2 minutes 30 seconds.

## Before recording

- Open https://adaptive-treasury-controller.onrender.com/ in a clean browser profile and sign in with a demo Google account.
- Use only sandbox data. Do not show `.env`, API keys, OAuth credentials, account identifiers, personal email addresses, or real beneficiary details.
- Have one clearly fictional obligation ready to enter, such as `Cloud infrastructure`, priority `NORMAL`, and a future due date. Choose an amount that fits below the displayed safe-to-allocate headroom.
- Show the balance refresh and planning/approval workflow. Do not execute a transfer during the recording. The hosted transfer-validation and provider read-back steps have not been verified.

## Timed walkthrough and narration

| Time | On screen | Voice-over |
| --- | --- | --- |
| 0:00-0:12 | Open https://adaptive-treasury-controller.onrender.com/ and show the Google sign-in page. Click **Continue with Google** and complete sign-in without showing the account chooser details. | “This is Adaptive Treasury Controller, a decision workspace for planning payments against confirmed cash. Each visitor signs in with their own identity and receives a separate private workspace.” |
| 0:12-0:30 | Show the empty workspace. Point briefly at the sandbox banner and the cash, reserve, headroom, and obligation cards. | “The workspace starts with no assumed balance. It separates available cash, the protected reserve, safe-to-allocate headroom, and the obligations entered by the operator.” |
| 0:30-0:48 | Click **Refresh Airwallex balance**. Wait for the real sandbox response and show the updated timestamp and values. | “A balance appears only after the server reads it from the Airwallex sandbox. The browser never receives the API key. Pending or expected receipts are not counted as spendable cash.” |
| 0:48-1:08 | Add the fictional obligation with an amount below safe-to-allocate headroom, priority, and due date. Show it in the obligations list. | “Next, I add a payment obligation. These records are operator-entered, so the system keeps the amount and due date visible as decision inputs rather than treating them as bank-confirmed data.” |
| 1:08-1:28 | Click **Recalculate** and show the proposed plan and reserve-aware decision. | “The planner recalculates from the latest confirmed balance and the configured reserve. It prioritizes obligations deterministically and does not include forecast receipts in available cash.” |
| 1:28-1:48 | Click the relevant **Approve** control, if the plan permits. Show the approved plan/evidence panel. | “An operator reviews and approves the current plan. Approval is tied to that plan; if the balance or obligations change, the system requires a fresh decision.” |
| 1:48-2:08 | Show the provider operations area. Do not click **Execute** or send a payment. | “Before a payment can be sent, the controller is designed to require provider validation and check the quoted cost against the reserve. I’m stopping this walkthrough before execution. No transfer is sent.” |
| 2:08-2:25 | Sign out. Sign in with a second demo Google identity and show its empty workspace. Do not show personal account details. | “Each Google identity has its own obligations, plans, approvals, and operation history. The connected sandbox account itself is shared by the hosted service, so provider funds are not partitioned by visitor.” |
| 2:25-2:35 | Return to title page or show the hosted app URL and project name. | “Adaptive Treasury Controller makes the evidence and operator decision visible before action. This walkthrough uses the Airwallex sandbox.” |

## Recording notes

- Keep cursor movements deliberate and pause after each response so values are readable.
- If the live balance refresh fails, stop and resolve the integration; do not replace it with fabricated values.
- Keep the recording at the approval/evidence stage. The Playwright transfer is a test-only simulation and must not be presented as a real provider transfer.
- Re-record the sign-in segment if the browser exposes personal identity details.
