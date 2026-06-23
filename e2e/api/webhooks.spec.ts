/**
 * Inbound email webhook — server-to-server API tests.
 *
 * POST /api/webhooks/inbound-email is not a browser flow — it's called by an
 * email provider (SendGrid/Mailgun) with a shared secret header. These tests
 * use Playwright's `request` fixture (APIRequestContext) to hit the running
 * test server directly, bypassing the client entirely.
 *
 * The webhook secret is read from process.env.INBOUND_WEBHOOK_SECRET, which
 * playwright.config.ts loads directly from server/.env.test via
 * process.loadEnvFile — no value is duplicated here.
 *
 * Each test uses a random messageId (crypto.randomUUID()) so repeated runs
 * against a real test database never collide with tickets left over from a
 * prior run.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";

if (!process.env.INBOUND_WEBHOOK_SECRET) {
  throw new Error("INBOUND_WEBHOOK_SECRET is required (expected from server/.env.test)");
}

const WEBHOOK_URL = "http://localhost:3001/api/webhooks/inbound-email";
const WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET;

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    from: "customer@example.com",
    fromName: "Jane Customer",
    to: "support@helpdesk.example",
    subject: "Cannot log in to my account",
    body: "I keep getting an error when I try to log in.",
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

test.describe("POST /api/webhooks/inbound-email", () => {
  test("creates a ticket from a valid payload with a messageId", async ({ request }) => {
    const messageId = randomUUID();
    const payload = makePayload({ messageId });

    const response = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: payload,
    });

    expect(response.status()).toBe(201);
    const { ticket } = await response.json();

    expect(ticket).toMatchObject({
      subject: payload.subject,
      body: payload.body,
      bodyHtml: null,
      senderName: payload.fromName,
      senderEmail: payload.from,
      status: "open",
      category: null,
      assignedTo: null,
    });
    expect(ticket.id).toBeTruthy();
    expect(ticket.receivedAt).toBeTruthy();
    expect(ticket.createdAt).toBeTruthy();
  });

  test("replaying the same messageId returns the original ticket idempotently", async ({
    request,
  }) => {
    const messageId = randomUUID();
    const payload = makePayload({ messageId });

    const first = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: payload,
    });
    expect(first.status()).toBe(201);
    const { ticket: firstTicket } = await first.json();

    const second = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: payload,
    });
    expect(second.status()).toBe(200);
    const { ticket: secondTicket } = await second.json();

    expect(secondTicket.id).toBe(firstTicket.id);
  });

  test("rejects requests with a missing or wrong webhook secret", async ({ request }) => {
    const payload = makePayload({ messageId: randomUUID() });

    const missingHeader = await request.post(WEBHOOK_URL, { data: payload });
    expect(missingHeader.status()).toBe(401);
    expect(await missingHeader.json()).toEqual({ error: "Unauthorized" });

    const wrongHeader = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": "definitely-not-the-secret" },
      data: payload,
    });
    expect(wrongHeader.status()).toBe(401);
    expect(await wrongHeader.json()).toEqual({ error: "Unauthorized" });
  });

  test("rejects an invalid body with a 400 and an error message", async ({ request }) => {
    const missingFromName = makePayload({ messageId: randomUUID() });
    delete (missingFromName as Record<string, unknown>).fromName;

    const response = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: missingFromName,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);

    const malformedEmail = makePayload({ messageId: randomUUID(), from: "not-an-email" });

    const response2 = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: malformedEmail,
    });

    expect(response2.status()).toBe(400);
    const body2 = await response2.json();
    expect(typeof body2.error).toBe("string");
    expect(body2.error.length).toBeGreaterThan(0);
  });

  test("creates a ticket with messageId: null when no messageId is provided", async ({
    request,
  }) => {
    const payload = makePayload();

    const response = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: payload,
    });

    expect(response.status()).toBe(201);
    const { ticket } = await response.json();

    expect(ticket.subject).toBe(payload.subject);
    expect(ticket.senderEmail).toBe(payload.from);
    // messageId is not part of ticketSelect's response shape directly, but
    // dedupe is impossible without one — verify by replaying a payload with
    // no messageId and confirming a *new* ticket is created each time.
    const replay = await request.post(WEBHOOK_URL, {
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      data: payload,
    });
    expect(replay.status()).toBe(201);
    const { ticket: replayTicket } = await replay.json();
    expect(replayTicket.id).not.toBe(ticket.id);
  });
});
