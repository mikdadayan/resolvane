/**
 * Reusable authentication helpers for Playwright e2e tests.
 *
 * loginAs() performs a full browser login for the given role. It is
 * intentionally a plain async function (not a fixture) so it can be called
 * freely inside test() callbacks without any fixture wiring overhead.
 *
 * Credentials are read from the environment variables that Playwright injects
 * from the webServer env block, matching what `server/.env.test` defines:
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *   AGENT_EMAIL / AGENT_PASSWORD
 */

import { type Page } from "@playwright/test";

export type Role = "admin" | "agent";

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin: {
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.ADMIN_PASSWORD ?? "password123",
  },
  agent: {
    email: process.env.AGENT_EMAIL ?? "agent@example.com",
    password: process.env.AGENT_PASSWORD ?? "password123",
  },
};

/**
 * Log in as the given role through the UI and wait for the redirect to `/`.
 * Safe to call in test.beforeEach() or at the top of any individual test.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = CREDENTIALS[role];

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

export { CREDENTIALS };
