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
  test("a webhook ticket opened and unassigned by an agent appears in the table", async ({
    page,
    request,
  }) => {
    const uniqueSubject = `E2E Test Subject ${randomUUID()}`;
    const ticket = await seedTicketViaWebhook(request, {
      subject: uniqueSubject,
      from: "E2E Customer <e2e-customer@example.com>",
    });

    await loginAs(page, "agent");
    // Move out of the worker's claimable "new" state before clearing its assignment.
    // In-flight auto-resolution only updates tickets still in "processing".
    const apiUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
    const opened = await page.request.patch(`${apiUrl}/api/tickets/${ticket.id}`, {
      data: { status: "open" },
    });
    expect(opened.ok()).toBeTruthy();
    const unassigned = await page.request.patch(`${apiUrl}/api/tickets/${ticket.id}/assign`, {
      data: { assignedToId: null },
    });
    expect(unassigned.ok()).toBeTruthy();
    await page.goto(`/tickets?search=${encodeURIComponent(uniqueSubject)}`);
    await expect(page).toHaveURL(/\/tickets\?search=/);

    const row = page.getByRole("row", { name: new RegExp(uniqueSubject) });
    await expect(row).toBeVisible();

    await expect(row.getByText(uniqueSubject)).toBeVisible();
    await expect(row.getByText(/E2E Customer.*e2e-customer@example\.com/)).toBeVisible();
    await expect(row.getByText("Open", { exact: true })).toBeVisible();
    await expect(row.getByText("Uncategorized", { exact: true })).toBeVisible();
    await expect(row.getByText("Unassigned", { exact: true })).toBeVisible();
  });
});
