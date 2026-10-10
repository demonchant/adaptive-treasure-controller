# Adaptive Treasury Controller

A treasury decision workspace for planning operator-entered obligations against an Airwallex sandbox USD balance while protecting a reserve. It refreshes the balance in the background, shows a deterministic pay/defer/escalate plan, and requires approval before a transfer can be submitted.

## Run locally

1. Copy `.env.example` to `.env` and add Airwallex sandbox credentials and Google OAuth client values. Keep `.env` private; never commit it.
2. Register `http://127.0.0.1:8080/auth/google/callback` as a Google OAuth redirect URI.
3. Start the app with `docker compose up --build -d app` and open `http://127.0.0.1:8080`.

See [setup instructions](docs/setup-guide.md) for configuration details.

## Workflow

Sign in, review the refreshed available cash, add obligations, calculate a plan, and approve an exact action. Transfers use payer-pays fees and reserve the entered obligation plus a configured maximum fee from the Airwallex account's fee schedule. Set `MAX_TRANSFER_FEE_USD` before approval and execution; the app fails closed while it is unset. Airwallex validation is a schema check, while ATC checks the actual payer cost returned after transfer creation. Reconcile uncertain or out-of-cap outcomes before retrying.

Obligations are operator-entered, the planner supports USD only, and pending funds are excluded from available cash. Transfer execution uses the Airwallex sandbox.
