import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL } } : {}),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node test/e2e-server.mjs',
    url: 'http://127.0.0.1:4173/healthz',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
