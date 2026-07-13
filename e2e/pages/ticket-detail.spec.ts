/**
 * Ticket detail page — e2e tests.
 *
 * The page lives at /tickets/:id and shows the ticket subject, sender info,
 * message body, a reply thread, a reply form, and a sidebar with Status,
 * Category, and Assigned to dropdowns.
 *
 * Component-level rendering (sender info, message body, empty reply state) is
 * covered by unit tests (TicketInfo, ReplyThread). These tests focus on auth,
 * navigation, and full-stack mutation flows that unit tests cannot cover.
 *
 * Each test seeds a fresh ticket via the inbound email webhook (via
 * seedTicketViaWebhook, shared with tickets.spec.ts and
 * e2e/api/webhooks.spec.ts) so tests are fully independent and never collide
 * with data from other runs against the shared test database.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { seedTicketViaWebhook } from "../fixtures/resend-webhook";

test.describe("Ticket detail page — access control", () => {
  test("unauthenticated visit to /tickets/:id redirects to /login", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicketViaWebhook(request);

    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Ticket detail page — content and interactions", () => {
  let ticketId: string;
  let ticketSubject: string;

  test.beforeEach(async ({ page, request }) => {
    ticketSubject = `Support request ${Date.now()}`;
    const ticket = await seedTicketViaWebhook(request, { subject: ticketSubject });
    ticketId = ticket.id;

    await loginAs(page, "agent");
    await page.goto(`/tickets/${ticketId}`);
    // Wait for the ticket heading to confirm the query resolved and the page rendered
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("renders the ticket subject as the main heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      ticketSubject
    );
  });

  test("Back to tickets link navigates to /tickets", async ({ page }) => {
    await page.getByRole("link", { name: "Back to tickets" }).click();
    await page.waitForURL("/tickets");
    await expect(page).toHaveURL("/tickets");
  });

  test("submitting a reply adds it to the thread and clears the textarea", async ({
    page,
  }) => {
    const replyBody = `Test reply ${Date.now()}`;
    const responsePromise = page.waitForResponse((resp) => {
      const url = new URL(resp.url());
      return (
        url.pathname.endsWith(`/api/tickets/${ticketId}/replies`) &&
        resp.request().method() === "POST"
      );
    });

    await page.getByLabel("Reply").fill(replyBody);
    await page.getByRole("button", { name: "Send Reply" }).click();
    await responsePromise;

    await expect(page.getByText(replyBody)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("No replies yet.")).not.toBeVisible();
    await expect(page.getByLabel("Reply")).toHaveValue("");
  });

  test("changing status to Resolved via the sidebar updates the dropdown", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse((resp) => {
      const url = new URL(resp.url());
      return (
        url.pathname.endsWith(`/api/tickets/${ticketId}`) &&
        resp.request().method() === "PATCH"
      );
    });

    await page.getByRole("combobox", { name: "Update status" }).click();
    await page.getByRole("option", { name: "Resolved" }).click();
    await responsePromise;

    await expect(
      page.getByRole("combobox", { name: "Update status" })
    ).toContainText("Resolved");
  });

  test("assigning the ticket via the sidebar updates the assignee dropdown", async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse((resp) => {
      const url = new URL(resp.url());
      return (
        url.pathname.endsWith(`/api/tickets/${ticketId}/assign`) &&
        resp.request().method() === "PATCH"
      );
    });

    await page.getByRole("combobox", { name: "Assign ticket" }).click();
    await page.getByRole("option", { name: "Agent", exact: true }).click();
    await responsePromise;

    await expect(
      page.getByRole("combobox", { name: "Assign ticket" })
    ).toContainText("Agent");
  });
});
