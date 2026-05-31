import { defineConfig, devices } from "@playwright/test";

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
      command: "bun --env-file .env.test --hot src/index.ts",
      cwd: "server",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun dev --port 5174",
      cwd: "client",
      port: 5174,
      env: { VITE_SERVER_BASE_URL: "http://localhost:3001" },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
