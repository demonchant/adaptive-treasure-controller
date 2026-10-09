# Airwallex Access and Hackathon Submission

Checked October 9, 2026 against the official Airwallex API and event pages. No credentials or organizer response are recorded here.

## Airwallex credentials for this app

For a real API call to the **sandbox**, obtain from the Airwallex sandbox web app:

- `AWX_CLIENT_ID`: sandbox Client ID.
- `AWX_API_KEY`: sandbox API key (secret; server only).
- `AWX_LOGIN_AS`: optional target Airwallex account ID only when the scoped key is linked to multiple accounts and account selection is required.

The workspace has no app password. Anyone with network access to the app can use the full workspace, including its configured sandbox key. The provided Docker Compose file publishes only to `127.0.0.1`; do not change that for a public deployment until access control and per-user provider authorization are designed.

No client secret, production key, or raw bearer token is needed. Airwallex exchanges Client ID/API key for a short-lived bearer token; the app now honors the returned `expires_at` and keeps the token server-side. See the [authentication contract](https://www.airwallex.com/docs/api/authentication/api_access_token) and [API key guidance](https://www.airwallex.com/docs/developer-tools/api/manage-api-keys).

For this app's full sandbox workflow, create a scoped key in **Settings > Developer > API keys > New scoped API key**. Name it (for example, `Adaptive Treasury Controller Sandbox`). Leave **Global permissions** empty. Under **Account permissions**, select only the sandbox account this app should use, then grant **Core Resources > Balances > Read** and **Payouts > Transfers > Read and Write**. The app asks the operator to enter a beneficiary ID and validates/transfers via the Transfers API; it does not call the Beneficiaries API. Do not grant `Read All`, `Write All`, unrelated product permissions, or `Simulations` for the current workflow. The app uses the transfer write scope for validation and creation, with a separate approval action in the UI. Keep a funded sandbox USD cash balance and a valid sandbox beneficiary for the full workflow. Airwallex says `x-login-as` is not needed for a key linked to one account; use the account ID there if the key covers multiple accounts and account-level access is needed.

Create a sandbox account, then in its web app go to Account/Settings → Developer → API keys. Use a scoped key and least privilege. For the app's first read-only verification, enable **Balances: Read**. For a payout workflow, add **Transfers: Read and Write** and **Beneficiaries: Read**; add **Simulations: Write** only if testing sandbox transfer-state simulation. Use an account with a funded USD cash balance. The guide says Kits 1–4 use sandbox and need no extra platform enablement, but that does not guarantee any particular account's key scopes, transfer route or beneficiary are ready.

Put the sandbox Client ID and API key in this repository's `.env` for local Docker use, or in the host's server-side secret settings for a hosted app. End users do not need the `.env` or Airwallex credentials; they use the browser interface while the server makes provider calls. Never paste credentials into chat, source code, a video, or a public issue. `.env` is ignored by Git and Docker build context. Do not use production credentials here: the adapter is hard-wired to the sandbox host and this app is not a production money-movement service.

## Verification order

1. Confirm login returns an `expires_at` token; do not save/token-print it in logs.
2. Press **Refresh Airwallex balance**. Confirm the real USD `available_amount`, pending and reserved fields are returned. Pending is not spendable.
3. Verify app evidence says `PROVIDER_SANDBOX`, with request time and sanitized provider response; compare independently in the Airwallex sandbox UI or a separate authorized GET.
4. Only after balance reads work, confirm a sandbox beneficiary and payout corridor. Do not attempt a transfer until the fee/cost is known before create and the sandbox operator explicitly approves it. Current app blocks create if validation does not return payer-cost evidence.
5. Capture sanitized evidence (status codes, timestamps, IDs, non-sensitive amounts); never record API key, bearer token, full bank details or account secrets.

Sandbox credentials do not move real money. “Live” for this hackathon should mean a live call to the sandbox APIs, not production funds. The official sandbox is separate and intended for simulations.

## Submission steps

The public event page says solo entry is allowed and requests a working demo, a video walkthrough under five minutes, and a repository link with setup instructions. It shows **Treasury & Ops / Adaptive Treasury Controller** as the matching starter kit. Registration/application closes October 23; accepted teams are notified October 25. HackerEarth lists the project submission deadline as **November 13, 2026 at 18:29 UTC** (19:29 Africa/Lagos). Check the signed-in event page in case the organizer changes dates or form fields.

1. Sign in to HackerEarth and register/apply for the [Agentic Banking Hackathon](https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/) before applications close.
2. Keep this as its own repository and project. Publish the repository somewhere judges can access; currently this local repository has no commit or remote.
3. Prepare the working demo, tested setup guide, and <5-minute video. The current app is local; it has no public deployment or verified sandbox demo yet. Do not invent a hosted URL if the form asks for one.
4. When the event's Submissions area opens, sign in, create the treasury project submission, select its relevant track, and provide exactly the fields the form requests. Public pages do not expose all signed-in form fields, so do not assume additional requirements.
5. Submit before the deadline, save the confirmation/receipt and a copy of the submitted links, and verify the entry appears in HackerEarth. Only then state that it was submitted.

The event page says “choose one or more tracks”; this does **not** establish permission to submit two distinct projects. If submitting TransferGuard as another hackathon entry is intended, that separate-project question remains unconfirmed. No submission has been made.

## Official sources

- [Hackathon page and FAQ](https://airwallex.hackerearth.com/)
- [HackerEarth event, schedule and submissions tab](https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/)
- [Airwallex sandbox overview](https://www.airwallex.com/docs/developer-tools/sandbox-environment)
- [Airwallex API key scopes](https://www.airwallex.com/docs/developer-tools/api/api-key-scopes)
- [Airwallex API key management](https://www.airwallex.com/docs/developer-tools/api/manage-api-keys)
