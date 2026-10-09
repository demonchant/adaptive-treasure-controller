# Competition Rules and Evidence

**Checked:** October 9, 2026. Official public event page and HackerEarth listing reviewed; full terms and judging rubric not located in public indexed material. Statements distinguish published items from unresolved questions.

## Event

- **Official name:** Agentic Banking Hackathon.
- **Organizer/host:** Airwallex. HackerEarth hosts the challenge and registration/submission interface.
- **Official event page:** https://airwallex.hackerearth.com/
- **HackerEarth challenge:** https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/
- **Airwallex builder guide:** https://airwallexdev.com/guide

## Dates and timezone

HackerEarth lists registration/idea phase **October 5–23, 2026, 3:30 PM–6:29 PM UTC**, and build phase **October 25–November 13, 2026, 4:30 AM–6:29 PM UTC**. Africa/Lagos is UTC+1: applications close **October 23 at 5:29 PM WAT**; build begins **October 25 at 5:30 AM WAT** and closes **November 13 at 7:29 PM WAT**. The main event page gives dates but not times/timezone. Confirm the HackerEarth countdown/form is authoritative at submission.

The main event page also says “Over 48 hours” while listing a multi-week period. This conflict is unresolved. Plan to the explicit HackerEarth interval but ask whether an additional 48-hour sprint or special build restriction exists.

## Tracks and relevant requirements

The event page says “Choose one or more tracks.” This describes track selection; it does **not** establish how many distinct projects one participant may submit.

| Track / kit | Published project | Setup | Fit |
|---|---|---|---|
| Treasury & Ops / 01 | Adaptive Treasury Controller: decide what obligations to fund, convert, defer or escalate when cash is short | Fund a wallet; sandbox | Primary, direct match |
| Treasury & Ops / 03 | Payment Ops Incident Commander: resolve a delayed supplier transfer without paying twice | Fund a wallet; sandbox | Adjacent; risks diluting the primary scope |
| Revenue Protection / 04 | Dispute Response Agent | No extra enablement; sandbox | Alternative; less aligned to treasury goal |

The Airwallex builder guide describes Kit 01 as five obligations across three currencies due over 72 hours. Only some can be paid after preserving a reserve floor. It recommends showing an initial plan, changed information, revised plan and resulting balance/payment/status; code should enforce constraints, approvals and transitions. Kit 01 needs no special platform enablement, but the sandbox wallet must be funded (using a simulated deposit if needed). The guide itself says it is not official Airwallex API documentation; exact contracts must be checked in Airwallex's API reference.

## Published judging criteria

**UNCONFIRMED / NOT PUBLISHED in materials reviewed.** The event page, FAQ and accessible HackerEarth overview do not publish criterion names, weights or a judging rubric. No numerical weights are stated here. Ask Airwallex/HackerEarth for the official rubric. Prize categories and starter kits are not a scoring rubric.

## Required deliverables

The event FAQ explicitly lists: (1) working demo, (2) short video walkthrough under five minutes, (3) repository link with setup instructions. HackerEarth shows a Submissions area, but public materials do not expose final form fields. **UNCONFIRMED:** slides, deployment URL, AI disclosure, track declaration, public repository or other form requirements. Public page does not state that deployment or a deck is required. Demo Day attendance in San Francisco is optional; remote participation/judging is available.

## Eligibility, code and submission rules

- Published FAQ: participant is 18+; online/global; solo is permitted; teams may have 1–4 members. Project IP stays with the builder; submission grants permission to showcase it.
- **Two projects:** UNCONFIRMED. “One or more tracks” does not answer project count. Do not submit a second project without confirmation.
- **Existing repositories/prior work:** UNCONFIRMED. No clear public statement was found allowing or prohibiting existing repositories, prewritten code, adaptation of TransferGuard or prior personal code. This project is separate and currently documentation-only; no TransferGuard code is copied.
- **Pre-build:** UNCONFIRMED. The event lists an idea phase and a build phase beginning Oct 25 but no accessible clause details what research, design, repo setup, API spike, tests or implementation are prohibited. Limit work to research/planning until clarified or the official build start, whichever is applicable. Do not treat silence as permission.
- **AI code/external services/starter kits:** UNCONFIRMED in event-specific terms. The builder guide provides starter kits but is not a substitute for challenge rules. Ask whether AI coding assistants, third-party models/hosting and adaptation of example code are permitted, and what disclosure is required.
- **Tracks:** multiple tracks may be selected for one project per event page; whether the actual form supports that is unconfirmed. This does not imply multiple project submissions.
- **Airwallex:** event positioning says “Build on Airwallex APIs”; builder guide places provider actions in the starter workflows. No event-specific minimum API-call rule or required endpoint found. This project uses Airwallex as source/action provider subject to sandbox verification.
- **Restricted capabilities:** Kits 1–4 need no extra enablement and use sandbox. Kits 5–8 require connected accounts/platform payments enabled by Airwallex. Kit 9 needs allowlisted Airi access and can involve real merchant purchases; Kit 10 requires merchant-side access and references a draft/proposed API. This project targets Kit 01 only.

## API feasibility

Airwallex builder guide, checked Oct 9, 2026: https://airwallexdev.com/guide. It documents sandbox API-key login, balances, Global Accounts, simulated deposits, beneficiary schema/validation/creation, FX quotes/conversion, transfers and sandbox transfer-state simulation. It says Kits 1–4 need no extra enablement. The guide is a build guide, not the formal API contract; check exact payloads in current API references.

Current official API references checked Oct 9, 2026: balances https://www.airwallex.com/docs/api/core_resources/balances/current and transfers https://www.airwallex.com/docs/api/payouts/transfers/create. The balances contract distinguishes cash `available_amount`, `pending_amount`, `reserved_amount` and `total_amount`; pending funds are not available cash. The transfer contract documents create, retrieve by transfer ID, list filtered by `request_id`, and a seven-day duplicate request-ID window; it explicitly recommends using the same `request_id` to look up an uncertain create. Create responses contain calculated payer/beneficiary amounts and fee fields. Transfer validation is documented as field validation, not a fee quote. These contracts are documented, but account access, scopes, exact corridor fee and actual state behavior remain unverified.

**Status: DOCUMENTED, NOT LIVE-VERIFIED.** No Airwallex request was made and no project-specific account credential/permission confirmed. A local `.env` exists in the separate TransferGuard repo; it was not read or used and is not authorization to copy. Builder must configure credentials for this repo. Verify login, account/balance, funding, quote/conversion, transfer creation/status and independent read-back before making live-provider claims.

## Organizer questions (not sent)

Contact `support@hackerearth.com` or ask Airwallex (builder guide lists `devhelp@airwallex.com` for API help, not confirmed as contest-rules contact):

1. Can one solo participant submit two distinct projects? Do they need separate registration/team/account, and can they use same/different tracks?
2. Does Oct 25 build start prohibit implementation before then? Which preparation (research, repo, design, code, API spike, tests) is allowed? Is “Over 48 hours” an additional window?
3. Are pre-existing repositories/code eligible? May prior personal code or TransferGuard be adapted? Must implementation begin during build phase?
4. Are AI code assistants and external AI/hosting permitted, and what disclosures are required?
5. What is the actual judging rubric and weights? Are impact, originality, technical quality, integration, demo or AI scored?
6. What exact form fields/artifacts are required; is deployment mandatory?
7. Can a project select multiple tracks in the form, and does that affect judging?

No organizer contact or response is claimed.

## Source log

| Source | Checked | Use |
|---|---|---|
| https://airwallex.hackerearth.com/ | 2026-10-09 | Event, tracks, broad dates, FAQ, prizes; no public rubric found |
| https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/ | 2026-10-09 | UTC phase dates and accessible challenge overview |
| https://airwallexdev.com/guide | 2026-10-09 | Starter kits, setup, sandbox/API pathways and constraints |
| https://www.airwallex.com/docs/api/core_resources/balances/current | 2026-10-09 | Official current-balance fields and available/pending/reserved distinctions |
| https://www.airwallex.com/docs/api/payouts/transfers/create | 2026-10-09 | Transfer create/retrieve/list, fee response, request-ID lookup/dedup and validate semantics |
| https://www.airwallex.com/docs/payouts/transfers/create-a-transfer/transfer-statuses | 2026-10-09 | Provider transfer lifecycle; PAID may later transition |
| https://www.airwallex.com/docs/api/authentication/api_access_token | 2026-10-09 | Client ID/API key exchange and token expiry |
| https://www.airwallex.com/docs/developer-tools/sandbox-environment | 2026-10-09 | Sandbox account, credentials, and testing separation |
| https://www.airwallex.com/docs/developer-tools/api/api-key-scopes | 2026-10-09 | Scoped API key resources and read/write permissions |
| https://www.airwallex.com/docs/developer-tools/api/manage-api-keys | 2026-10-09 | Scoped-key creation and optional account targeting |
| `../HACKATHON_BUILD_STANDARD_V2.md` (workspace parent) | 2026-10-09 | Complete local build standard: gates, research, idea scoring, architecture, tests, review and finish requirements |
