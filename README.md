# Adaptive Treasury Controller

An independently built, USD-only treasury decision workflow, separate from `transferguard`. It reads actual Airwallex sandbox cash balances, plans operator-entered obligations against a configurable reserve, requires explicit approval, and exposes reconcile-before-retry for uncertain provider outcomes.

**Honest status:** real Airwallex sandbox credentials are configured locally but no live provider read or transfer has yet been verified. Transfer execution fails closed if validation does not disclose payer cost. The app uses a real provider adapter and has no production-host switch. Google sign-in gives each visitor a separate persistent workspace. Competition eligibility and submission remain unconfirmed.

## Run with Docker

1. Set server-side Airwallex credentials and Google OAuth client credentials in `.env`. Register `http://127.0.0.1:8080/auth/google/callback` as a Google OAuth redirect URI for local use. End users need only their Google account; never give them `.env`.
2. Run `docker compose up --build -d app`, then open `http://127.0.0.1:8080`.
3. Run the automated suite with `docker compose run --build --rm test`.
4. Run the real-browser multi-user workflow with `npm run test:e2e` after installing Playwright Chromium (`npx playwright install chromium`).

Detailed setup, safety behavior and verification boundaries: [`docs/setup-guide.md`](docs/setup-guide.md).
Hosted deployment notes: [`docs/deployment.md`](docs/deployment.md).
Sandbox credential checklist and submission steps: [`docs/credentials-and-submission.md`](docs/credentials-and-submission.md).

## User workflow

Refresh the Airwallex USD cash balance, enter obligations and their priority/due date, calculate the plan, approve a specific current action, then execute only if provider validation exposes a known payer cost that fits above reserve. Unknown outcomes require provider reconciliation; never retry blindly. Obligations are manual operator input. Pending balances are shown separately and not treated as spendable. This first slice excludes FX, AI and automatic execution.

## Project records

- Competition evidence: [`docs/competition-rules.md`](docs/competition-rules.md), [`docs/idea-selection.md`](docs/idea-selection.md)
- Product/architecture: [`docs/hardest-promise.md`](docs/hardest-promise.md), [`docs/architecture.md`](docs/architecture.md)
- Proof: [`docs/claim-proof-ledger.md`](docs/claim-proof-ledger.md), [`docs/verification-plan.md`](docs/verification-plan.md), [`docs/demo-plan.md`](docs/demo-plan.md)
- Known risks and limits: [`docs/risk-register.md`](docs/risk-register.md), [`docs/rubric-matrix.md`](docs/rubric-matrix.md)
- Actual Docker suite result: [`docs/test-report.md`](docs/test-report.md)
