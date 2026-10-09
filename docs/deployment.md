# Hosted deployment

The repository includes a Render Blueprint in `render.yaml`. It builds the production Docker target, attaches a 1 GB persistent disk at `/var/data`, stores one SQLite workspace per verified Google account, sets `/healthz` as the health check, and keeps the service on one instance. The disk is required: Render's ordinary filesystem is ephemeral, and its disks are available on paid services and cannot be shared across multiple instances. See [Render Docker deployment](https://render.com/docs/docker), [persistent disks](https://render.com/docs/disks), and [pricing](https://render.com/pricing).

The selected Render Starter web service is currently listed at $7/month. A 1 GB disk at $0.25/GB/month makes the baseline about $7.25/month, before taxes or usage outside included limits. Verify the dashboard total before creating the service; Render prorates compute and may charge for extra bandwidth. The user has authorized a paid hosting setup.

## Before creating the service

1. Create a Google Cloud OAuth **Web application** client. Include the eventual hosted callback `https://<your-render-hostname>/auth/google/callback` in its authorized redirect URIs.
2. Keep the sandbox Airwallex Client ID and scoped API key available. These go into Render's service environment variables, not GitHub or the browser.
3. Publish this repository to a GitHub repository that Render can connect to. `.env`, `.data`, workspace databases, test results, and Playwright reports are ignored.
4. In Render, create a Blueprint instance from that repository using `render.yaml`. Choose the paid Starter plan and Frankfurt region. Enter Airwallex and Google OAuth secrets in the Blueprint's prompted secret fields.

Render provides the service's HTTPS URL as `RENDER_EXTERNAL_URL`; the app uses it as the Google OAuth callback origin. If the generated hostname differs from the one entered in Google Cloud, update the authorized redirect URI to match exactly and redeploy or restart the service. Render's docs describe its generated external URL and secret environment-variable workflow: [default environment variables](https://render.com/docs/environment-variables), [environment variables and secrets](https://render.com/docs/configure-environment-variables).

After deployment, visit `/healthz`, then open the root URL and sign in with Google. Verify that separate Google accounts see empty, independent workspaces. Refresh a sandbox balance and run the read-only workflow first. Do not execute a sandbox transfer as part of deployment verification; it needs separate explicit approval.

## Deployment boundary

Google identities and local app data are isolated per visitor, but every visitor uses the same server-side Airwallex sandbox key/account. Their sandbox balance is shared. The app serializes transfer attempts in one server process and refreshes the provider balance before execution. Do not scale this SQLite-backed service to multiple instances. The current repository has no GitHub remote and no Render/Google account connection in this workspace, so a URL cannot be claimed until the user links the repository and finishes OAuth credentials in those dashboards.
