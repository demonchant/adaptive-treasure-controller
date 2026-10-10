# Adaptive Treasury Controller

A treasury decision workspace that helps operators decide which bills can be paid from confirmed Airwallex sandbox USD cash while keeping a protected reserve intact.

Small teams often track cash, invoices, and payment approvals in separate places. This makes it hard to know whether a bill is affordable now, whether the balance is current, and whether paying it would consume cash reserved for essentials. ATC brings those inputs into one reviewable, auditable workflow.

## Run locally

1. Copy `.env.example` to `.env` and add Airwallex sandbox credentials and Google OAuth client values. Keep `.env` private; never commit it.
2. Register `http://127.0.0.1:8080/auth/google/callback` as a Google OAuth redirect URI.
3. Start the app with `docker compose up --build -d app` and open `http://127.0.0.1:8080`.

See [setup instructions](docs/setup-guide.md) and the [project overview](docs/project-overview.md) for configuration, workflow, and scope.

## Workflow

Sign in, refresh the confirmed balance, add manual obligations, calculate a plan, approve an exact action, and then execute a sandbox payout as a separate step. ATC keeps pending funds out of available cash, reserves the configured floor, and counts the configured maximum payer fee for each planned transfer. Set `MAX_TRANSFER_FEE_USD` from the fee schedule for the actual Airwallex account and payout route before approvals can be made. Airwallex validation checks request requirements; the actual payer cost is returned after transfer creation. ATC flags missing or out-of-cap costs and requires reconciliation before another attempt.

Obligations are operator-entered, the planner supports USD only, and transfers use the Airwallex sandbox. See the [demo voiceover](docs/demo-voiceover.md) and [verification results](docs/test-results.md). The edited submission video is [Demo 2](demo/2.mp4).
