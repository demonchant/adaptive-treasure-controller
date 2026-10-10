# Setup

## Requirements

- Docker Engine with Docker Compose v2.
- Airwallex sandbox API credentials.
- A Google OAuth web application client.

## Configure credentials

Copy `.env.example` to `.env`. Set `AWX_CLIENT_ID`, `AWX_API_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Keep `.env` on the server and out of version control. The browser does not need provider credentials.

In Google Cloud Console, add this local redirect URI to the OAuth client:

```text
http://127.0.0.1:8080/auth/google/callback
```

Use a scoped sandbox API key with permission to read balances and read/write payout transfers. `RESERVE_USD` sets the protected reserve; it defaults to `30.00`.

Set `MAX_TRANSFER_FEE_USD` to a positive, conservative maximum fee for one USD payout, based on the fee schedule for the configured Airwallex account and route. The planner reserves the obligation amount plus this fee cap. The transfer uses payer-pays fees, so the beneficiary receives the entered obligation amount. Airwallex's validation response is not a fee quote; ATC checks the actual payer cost returned after transfer creation and flags any missing or out-of-cap amount for reconciliation. Leave the value unset until you have verified the fee schedule; approvals and execution remain disabled while it is unset. On Render, add this value as a service environment variable, then recalculate and approve a new plan.

## Start the application

```sh
docker compose up --build -d app
```

Open `http://127.0.0.1:8080`. The app stores workspace data in the Docker volume. To stop it:

```sh
docker compose down
```

## Safety and scope

Each Google identity has a separate application workspace. Workspaces share the server-configured Airwallex sandbox account and balance. Obligations are manual inputs; the app supports USD only and does not automate approvals. Unknown transfer outcomes must be reconciled before retrying.
