# Setup and Reproducible Review

## Requirements

- Docker Engine with Docker Compose v2.
- Airwallex sandbox Client ID and scoped API key.
- A Google OAuth web application client ID and client secret.

## Configure sign-in

In Google Cloud Console, create an OAuth client with application type **Web application**. Add this authorized redirect URI for local use:

```text
http://127.0.0.1:8080/auth/google/callback
```

For a hosted service, add its HTTPS callback URI as well; see [`deployment.md`](deployment.md). The app requests only `openid email profile`. Each verified Google subject receives a distinct SQLite workspace. Visitors can sign in with their own Google account; they do not need the app's `.env` or Airwallex credentials.

## Configure Airwallex

Set `AWX_CLIENT_ID`, `AWX_API_KEY`, and optional `AWX_LOGIN_AS` in the server's `.env`. The provider adapter is sandbox-only. Never copy these variables into browser code or expose the `.env` file.

For a scoped key, select the sandbox account under **Account permissions**, then grant **Core Resources > Balances > Read** and **Payouts > Beneficiaries > Read** plus **Payouts > Transfers > Read and Write**. Balance read is needed for refresh; beneficiary and transfer permissions support validation, creating transfers, and reconciliation. Do not grant unrelated resources. Leave `AWX_LOGIN_AS` blank for the primary account unless Airwallex specifically requires a target account ID. Airwallex documents these endpoint-to-scope mappings in its [API key scope reference](https://www.airwallex.com/docs/developer-tools/api/api-key-scopes) and [scoped key setup guide](https://www.airwallex.com/docs/developer-tools/api/manage-api-keys).

## Start locally

Copy `.env.example` to `.env` only if you are starting from a clean checkout. Keep existing Airwallex values when adding Google OAuth values. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_BASE_URL=http://127.0.0.1:8080`, then run:

```sh
docker compose up --build -d app
docker compose logs -f app
```

Open `http://127.0.0.1:8080`. Local Compose publishes only on host loopback. Persistent user workspaces are stored in the `treasury-data` volume. Direct `npm start` uses `.data/workspaces` on the local machine.

## Test

Run unit and HTTP tests:

```sh
docker compose run --build --rm test
```

Install the Playwright browser once, then run the Chromium workflow, including separate Alice/Bob workspaces and a test-only transfer adapter:

```sh
npx playwright install chromium
npm run test:e2e
```

The test identity provider and Airwallex adapter exist only in the test harness. They are not application fallbacks and are not included in the production image. The test-only transfer does not contact Airwallex.

## Visitor workflow

1. Sign in with Google.
2. Refresh a real sandbox USD cash balance.
3. Add an obligation and calculate a plan against available cash and the reserve.
4. Approve the exact current action.
5. Execute only when transfer validation provides a payer cost that fits above reserve.
6. Reconcile uncertain provider outcomes before retrying.

Every user has separate balances, obligations, plans, approvals, and operation history. A hosted instance still uses the one Airwallex sandbox account and key configured on the server. Users share that provider account's real sandbox balance; separate app workspaces do not create separate Airwallex accounts or balances.

## Limitations

The planner is deterministic greedy allocation, not a global optimizer. Currency support is USD only; no FX, receipt ingestion, AI, multi-account optimization, webhook verification, or automatic payout approval exists. Third-party debits can occur after a balance read; the app's reserve is not a provider-enforced hold. Live sandbox authentication, balances, transfer validation, fees, and transfer read-back remain unverified until separately checked.
