import { test, expect, type Page } from "@playwright/test";

async function waitForTickets(page: Page, navigate: () => Promise<unknown>) {
  // Listen before navigating so fast API responses cannot race the assertion.
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/tickets"
    && response.request().method() === "GET",
  );
  await navigate();
  const response = await responsePromise;
  expect(response.status(), "The deployed tickets API must return 200").toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const result = await response.json();
  expect(Array.isArray(result.tickets), "The API must return a tickets array").toBe(true);
  expect(typeof result.total, "The API must return a ticket count").toBe("number");
  await expect(page).toHaveURL(/\/tickets\/?$/);
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ matching tickets/)).toBeVisible();
}

test("deployed frontend supports login, tickets, direct refresh, and logout", async ({ page, baseURL }) => {
  await test.step("Sign in through the deployed frontend", async () => {
    await page.goto("/login");
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill(process.env.SMOKE_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(process.env.SMOKE_PASSWORD!);

    const responsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/sign-in/email"
      && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    expect((await responsePromise).status(), "The deployed sign-in request must succeed").toBe(200);
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  });

  // These operations only read tickets; no users, tickets, replies, or webhooks are created.
  await test.step("Load tickets from the real API", async () => {
    await waitForTickets(page, () => page.getByRole("link", { name: "Tickets", exact: true }).click());
  });

  await test.step("Refresh /tickets and retain the authenticated session", async () => {
    await waitForTickets(page, () => page.reload());
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  });

  await test.step("Sign out and reject a subsequent protected-page visit", async () => {
    const responsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/sign-out"
      && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    expect((await responsePromise).status(), "The deployed sign-out request must succeed").toBe(200);
    await expect(page).toHaveURL(new URL("/login", baseURL!).href);
    await page.goto("/tickets");
    await expect(page).toHaveURL(new URL("/login", baseURL!).href);
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  });
});
