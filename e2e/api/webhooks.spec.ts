/**
 * Inbound email webhook — server-to-server API tests.
 *
 * POST /api/webhooks/inbound-email is a Resend `email.received` webhook, not
 * a browser flow. It's authenticated by real Svix signature verification
 * (svix-id / svix-timestamp / svix-signature headers) instead of a shared
 * secret header, via `requireWebhookSecret`
 * (server/src/middleware/require-webhook-secret.ts), which calls
 * `resend.webhooks.verify(...)` under the hood.
 *
 * These tests use Playwright's `request` fixture (APIRequestContext) to hit
 * the running test server directly, bypassing the client entirely. The
 * signing/fixture-seeding helpers live in ../fixtures/resend-webhook.ts and
 * are shared with the page-level e2e specs that just need a ticket seeded.
 *
 * Each test uses a random emailId/messageId (crypto.randomUUID()) so repeated
 * runs against a real test database never collide with tickets left over
 * from a prior run.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import {
  WEBHOOK_URL,
  makeEmailFixture,
  seedResendEmail,
  makeReceivedEnvelope,
  signEnvelope,
  postSignedEnvelope,
} from "../fixtures/resend-webhook";

test.describe("POST /api/webhooks/inbound-email", () => {
  test("creates a ticket from a validly-signed email.received event, mapping fields from the fetched Resend fixture", async ({
    request,
  }) => {
    const fixture = makeEmailFixture({ id: randomUUID(), message_id: randomUUID() });
    await seedResendEmail(request, fixture);

    const response = await postSignedEnvelope(request, makeReceivedEnvelope(fixture));

    expect(response.status()).toBe(201);
    const { ticket } = await response.json();

    // assignedTo is intentionally not asserted here — the webhook always
    // assigns new tickets to the AI auto-resolution agent, which is a
    // separate concern from the webhook contract this file is testing.
    expect(ticket).toMatchObject({
      subject: fixture.subject,
      body: fixture.text,
      bodyHtml: null,
      senderName: "Jane Customer",
      senderEmail: "customer@example.com",
      status: "new",
      category: null,
    });
    expect(ticket.id).toBeTruthy();
    expect(ticket.receivedAt).toBeTruthy();
    expect(ticket.createdAt).toBeTruthy();
  });

  test("replaying the same message_id returns the original ticket idempotently", async ({ request }) => {
    const fixture = makeEmailFixture({ id: randomUUID(), message_id: randomUUID() });
    await seedResendEmail(request, fixture);
    const envelope = makeReceivedEnvelope(fixture);

    const first = await postSignedEnvelope(request, envelope);
    expect(first.status()).toBe(201);
    const { ticket: firstTicket } = await first.json();

    const second = await postSignedEnvelope(request, envelope);
    expect(second.status()).toBe(200);
    const { ticket: secondTicket } = await second.json();

    expect(secondTicket.id).toBe(firstTicket.id);
  });

  test("rejects requests with missing or invalid svix headers", async ({ request }) => {
    const fixture = makeEmailFixture({ id: randomUUID(), message_id: randomUUID() });
    await seedResendEmail(request, fixture);
    const envelope = makeReceivedEnvelope(fixture);
    const payload = JSON.stringify(envelope);

    const missingHeaders = await request.post(WEBHOOK_URL, {
      headers: { "content-type": "application/json" },
      data: payload,
    });
    expect(missingHeaders.status()).toBe(401);
    expect(await missingHeaders.json()).toEqual({ error: "Unauthorized" });

    const { headers: validHeaders } = signEnvelope(envelope);
    const invalidSignature = await request.post(WEBHOOK_URL, {
      headers: { ...validHeaders, "svix-signature": "v1,not-the-real-signature" },
      data: payload,
    });
    expect(invalidSignature.status()).toBe(401);
    expect(await invalidSignature.json()).toEqual({ error: "Unauthorized" });
  });

  test("ignores a validly-signed non-email.received event and creates no ticket", async ({ request }) => {
    const envelope = {
      type: "email.sent" as const,
      created_at: new Date().toISOString(),
      data: {
        email_id: randomUUID(),
        created_at: new Date().toISOString(),
        from: "Jane Customer <customer@example.com>",
        to: ["support@resolvane.example"],
        subject: "Cannot log in to my account",
      },
    };

    const response = await postSignedEnvelope(request, envelope);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ignored: "email.sent" });
  });

  test("maps a bare sender address (no display name) to matching senderName and senderEmail", async ({ request }) => {
    const fixture = makeEmailFixture({
      id: randomUUID(),
      message_id: randomUUID(),
      from: "customer@example.com",
    });
    await seedResendEmail(request, fixture);

    const response = await postSignedEnvelope(request, makeReceivedEnvelope(fixture));

    expect(response.status()).toBe(201);
    const { ticket } = await response.json();

    expect(ticket.senderName).toBe("customer@example.com");
    expect(ticket.senderEmail).toBe("customer@example.com");
  });
});
