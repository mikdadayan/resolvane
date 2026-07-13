/**
 * Tickets list page — read-only table e2e tests.
 *
 * GET /api/tickets requires only a logged-in session (requireAuth, no
 * requireAdmin) — unlike /users, the /tickets route is not wrapped in
 * AdminRoute, so both admin and agent should be able to view it.
 *
 * There is no UI for creating tickets yet, so the "row appears with real
 * data" test seeds a ticket through the inbound email webhook (via
 * seedTicketViaWebhook, shared with e2e/api/webhooks.spec.ts) using
 * Playwright's `request` fixture, then navigates to /tickets in the browser
 * to assert it renders correctly. Each seeded ticket uses a random
 * messageId/emailId and a unique subject so repeated runs against the shared
 * test database never collide with leftover data.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { loginAs } from "../fixtures/auth";
import { seedTicketViaWebhook } from "../fixtures/resend-webhook";

const TABLE_HEADERS = ["Subject", "From", "Status", "Category", "Assigned", "Received"];

test.describe("Tickets page — access control", () => {
  test("agent can navigate to /tickets via the Navbar and sees the table headers", async ({
    page,
  }) => {
    await loginAs(page, "agent");
    await page.getByRole("link", { name: "Tickets" }).click();
    await page.waitForURL("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();

    for (const header of TABLE_HEADERS) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });

  test("admin can also navigate to /tickets (not admin-only, unlike /users)", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.getByRole("link", { name: "Tickets" }).click();
    await page.waitForURL("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();

    for (const header of TABLE_HEADERS) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });

  test("unauthenticated visit to /tickets redirects to /login", async ({ page }) => {
    await page.goto("/tickets");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Tickets page — seeded ticket data", () => {
  test("a ticket seeded via the inbound webhook appears in the table with expected defaults", async ({
    page,
    request,
  }) => {
    const uniqueSubject = `E2E Test Subject ${randomUUID()}`;
    await seedTicketViaWebhook(request, {
      subject: uniqueSubject,
      from: "E2E Customer <e2e-customer@example.com>",
    });

    await loginAs(page, "agent");
    await page.goto("/tickets");
    await expect(page).toHaveURL("/tickets");

    const row = page.getByRole("row", { name: new RegExp(uniqueSubject) });
    await expect(row).toBeVisible();

    await expect(row.getByText(uniqueSubject)).toBeVisible();
    await expect(row.getByText(/E2E Customer.*e2e-customer@example\.com/)).toBeVisible();
    await expect(row.getByText("open", { exact: true })).toBeVisible();
    await expect(row.getByText("Uncategorized", { exact: true })).toBeVisible();
    await expect(row.getByText("Unassigned", { exact: true })).toBeVisible();
  });
});
