# Adaptive Treasury Controller handover

Last updated: October 9, 2026. This repository is separate from `TransferGuard`; do not edit or combine that project.

## User's goal and decisions

- Run the full treasury workflow for public visitors without requiring an app password or exposing `.env`.
- Give each visitor a separate identity and private application workspace. User selected separate workspace per visitor.
- Host the app and validate it with Docker and Playwright.
- Prepare a screen-recording and voice-over script after verification.
- User has authorized paid hosting. Do not execute a real Airwallex transfer without explicit approval.

## Current implementation

- Passwordless Google OAuth is implemented. Each verified Google subject gets a dedicated SQLite database file for balances, obligations, plans, approvals, and operations. Sessions are separate.
- Each visitor's workspace uses the same server-side Airwallex sandbox account/key. The app data is isolated, but the provider balance and transfer capacity are shared.
- The application and production Docker image are configured. `compose.yaml` binds local access to `127.0.0.1:8080`; a named volume persists user workspaces.
- `render.yaml` defines a paid single-instance Docker service and persistent disk. It is a deployment recipe, not an existing public service.
- The local `.env` contains Airwallex values. Never print, request, commit, or copy those values into chat. Google OAuth values were added as empty entries and still need to be set.
- The test harness has fake identities and a fake Airwallex adapter. These are test-only; production has no mock/demo fallback.

## Verification completed

- `docker compose run --build --rm test`: JavaScript checks and 16 tests passed.
- `$env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run test:e2e` (PowerShell): browser workflow passed with separate Alice/Bob data and the fake test adapter.
- `docker compose build app`: passed.
- Docker smoke checks: `GET /healthz` and `GET /` returned HTTP 200. The local app container was stopped after the checks.
- A read-only request using `.env` authenticated to Airwallex sandbox and confirmed a USD balance was returned. The amount was not printed. No transfer validation/creation was attempted.
- No live Google OAuth, transfer validation/provider read-back, or public deployment has been verified. See `docs/test-report.md`.

## Remaining blockers for hosting

1. Create a Google Cloud OAuth Web application client and configure its client ID and secret in the local `.env` and Render secret prompts. Add these exact redirect URIs:
   - Local: `http://127.0.0.1:8080/auth/google/callback`
   - Hosted: `https://<actual-render-hostname>/auth/google/callback`
2. Connect this repository to a GitHub repository that Render can access. The current checkout has no commit or remote.
3. Create the Render Blueprint from `render.yaml`, enter the Airwallex and Google secrets in Render, and verify the deployed sign-in and sandbox read-only workflow.

The current deployment plan is about $7.25/month at listed Starter and 1 GB disk rates, before taxes or usage outside included limits. Recheck the dashboard price when creating it. See `docs/deployment.md`.

## Important boundary

The E2E transfer is simulated by the test adapter. Do not describe it as a real transfer. The live app must be verified with a read-only balance refresh before any separately approved sandbox transfer. SQLite is configured for one service instance; do not scale the Render service horizontally.

## Useful files

- `README.md` - overview and Docker commands.
- `docs/setup-guide.md` - local setup and visitor workflow.
- `docs/deployment.md` - Render and OAuth deployment steps.
- `docs/test-report.md` - verification evidence and limitations.
- `docs/screen-recording-script.md` - draft walkthrough and narration.
- `render.yaml`, `compose.yaml`, `Dockerfile` - deployment/runtime configuration.
- `.env.example` - variable names only; `.env` remains ignored.
