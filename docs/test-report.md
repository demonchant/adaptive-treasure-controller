# Verification report

**Date:** October 9, 2026

## Automated checks

- `docker compose run --build --rm test`: passed. JavaScript checks and all **16 unit/HTTP tests** passed inside the Node 24 Alpine test image.
- `$env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run test:e2e` (PowerShell): passed. The browser workflow verified unauthenticated access is denied, Alice can refresh a test balance and complete the obligation/plan/approval/test-transfer flow, Bob receives a separate empty workspace, and Alice's data persists after reload.
- `docker compose build app`: passed for the production image.
- Docker runtime smoke check: `GET /healthz` returned HTTP 200 and `GET /` returned HTTP 200 with the application page.

Playwright used the locally installed Microsoft Edge browser to avoid downloading a second large browser runtime. The E2E server injects fake Google identities and a fake Airwallex adapter. Those test-only adapters are not included in the production image; no real Google or Airwallex request was made, and no transfer was sent.

A separate read-only request using the configured local `.env` successfully authenticated to the Airwallex sandbox and found a USD cash balance. Only success and currency were printed; the amount and credentials were not. No transfer validation or creation was requested.

## What remains unverified

- The real Google OAuth client ID and secret are not configured yet, so visitor sign-in is not ready in the local or hosted deployment.
- Real Airwallex sandbox authentication and the current USD cash balance read are verified. Transfer validation, transfer creation, and provider read-back have not been verified.
- No public hosting deployment exists yet. The Render Blueprint is prepared, but the repository has no remote and no Render or Google Cloud account is connected to this workspace.

See [`verification-plan.md`](verification-plan.md) and [`deployment.md`](deployment.md) for remaining setup steps.
