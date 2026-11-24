import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL;
if (!baseURL) throw new Error("SMOKE_BASE_URL is required for deployed smoke tests.");

let target: URL;
try {
  target = new URL(baseURL);
} catch {
  throw new Error("SMOKE_BASE_URL must be an HTTPS origin.");
}

const localHTTP = target.protocol === "http:"
  && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
if ((target.protocol !== "https:" && !localHTTP)
  || target.pathname !== "/" || target.search || target.hash
  || target.username || target.password) {
  throw new Error("SMOKE_BASE_URL must be an HTTPS origin (HTTP is allowed only on loopback).");
}

for (const name of ["SMOKE_EMAIL", "SMOKE_PASSWORD"]) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required for deployed smoke tests.`);
}

export default defineConfig({
  // Separate from local E2E: no server startup, environment file, or database seed.
  testDir: "./smoke",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: "./smoke/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./smoke/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: target.origin,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Traces contain network traffic and login inputs. Do not record credentials.
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
