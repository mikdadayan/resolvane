import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Load server/.env.test into this process so test files can read the same
// RESEND_WEBHOOK_SECRET / ADMIN_EMAIL / etc. values the test server uses,
// instead of duplicating them as hardcoded fallbacks in test code.
process.loadEnvFile(path.resolve(__dirname, "server/.env.test"));

const SERVER_PORT = 3001;
const SERVER_BASE_URL = `http://localhost:${SERVER_PORT}`;
const RESEND_STUB_PORT = 3002;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: "./e2e/test-results",
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "/Users/mikayeldadayan/.bun/bin/bun resend-stub-server.ts",
      cwd: "e2e",
      port: RESEND_STUB_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "/Users/mikayeldadayan/.bun/bin/bun --env-file .env.test --hot src/index.ts",
      cwd: "server",
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "/Users/mikayeldadayan/.bun/bin/bun dev --port 5174",
      cwd: "client",
      port: 5174,
      env: { VITE_SERVER_BASE_URL: SERVER_BASE_URL },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
