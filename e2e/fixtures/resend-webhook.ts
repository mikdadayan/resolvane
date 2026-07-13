/**
 * Reusable helpers for seeding tickets through the real Resend inbound-email
 * webhook contract in e2e tests.
 *
 * POST /api/webhooks/inbound-email is authenticated by real Svix signature
 * verification (svix-id/svix-timestamp/svix-signature headers), and the route
 * fetches the full email body via `resend.emails.receiving.get(email_id)`,
 * which RESEND_BASE_URL (server/.env.test) redirects to a local fixture stub
 * server (e2e/resend-stub-server.ts, port 3002) instead of the real Resend
 * API. Seeding a ticket therefore requires two steps: register a fixture with
 * the stub, then POST a matching signed `email.received` envelope.
 *
 * `seedTicketViaWebhook()` is the high-level entry point most tests should
 * use. The lower-level pieces are exported too since e2e/api/webhooks.spec.ts
 * needs finer control (e.g. to send a deliberately invalid signature).
 */

import { type APIRequestContext } from "@playwright/test";
import { randomUUID } from "crypto";
import { Webhook } from "svix";

if (!process.env.RESEND_WEBHOOK_SECRET) {
  throw new Error("RESEND_WEBHOOK_SECRET is required (expected from server/.env.test)");
}

export const WEBHOOK_URL = "http://localhost:3001/api/webhooks/inbound-email";
export const RESEND_STUB_URL = "http://localhost:3002";
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

/** Matches Resend's `GetReceivingEmailResponseSuccess` shape — the fixture the stub server returns. */
export type ResendEmailFixture = {
  object: "email";
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  bcc: string[];
  cc: string[];
  reply_to: string[] | null;
  received_for: string[];
  html: string | null;
  text: string | null;
  headers: Record<string, string> | null;
  message_id: string;
  attachments: unknown[];
};

export function makeEmailFixture(
  overrides: Partial<ResendEmailFixture> & { id: string; message_id: string },
): ResendEmailFixture {
  return {
    object: "email",
    to: ["support@helpdesk.example"],
    from: "Jane Customer <customer@example.com>",
    created_at: new Date().toISOString(),
    subject: `Support request ${randomUUID()}`,
    bcc: [],
    cc: [],
    reply_to: null,
    received_for: ["support@helpdesk.example"],
    html: null,
    text: "I need help with my order.",
    headers: null,
    attachments: [],
    ...overrides,
  };
}

/** Seeds the fixture the app's `resend.emails.receiving.get()` call will resolve to. */
export async function seedResendEmail(request: APIRequestContext, fixture: ResendEmailFixture): Promise<void> {
  const response = await request.post(`${RESEND_STUB_URL}/emails/receiving/${fixture.id}`, {
    data: fixture,
  });
  if (response.status() !== 204) {
    throw new Error(`Failed to seed Resend fixture: ${response.status()}`);
  }
}

/** Builds the `email.received` webhook envelope Resend would send for a given fixture. */
export function makeReceivedEnvelope(fixture: ResendEmailFixture) {
  return {
    type: "email.received" as const,
    created_at: fixture.created_at,
    data: {
      email_id: fixture.id,
      created_at: fixture.created_at,
      from: fixture.from,
      to: fixture.to,
      bcc: fixture.bcc,
      cc: fixture.cc,
      received_for: fixture.received_for,
      message_id: fixture.message_id,
      subject: fixture.subject,
      attachments: [],
    },
  };
}

/**
 * Signs an envelope with a real Svix signature, matching what
 * `resend.webhooks.verify()` expects. The exact JSON string signed here must
 * be the exact request body sent, since the route re-derives the signed
 * payload as `JSON.stringify(req.body)`.
 */
export function signEnvelope(envelope: unknown): { payload: string; headers: Record<string, string> } {
  const payload = JSON.stringify(envelope);
  const wh = new Webhook(RESEND_WEBHOOK_SECRET);
  const svixId = `msg_${randomUUID()}`;
  const svixTimestamp = new Date();
  const signature = wh.sign(svixId, svixTimestamp, payload);

  return {
    payload,
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": String(Math.floor(svixTimestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
  };
}

export async function postSignedEnvelope(request: APIRequestContext, envelope: unknown) {
  const { payload, headers } = signEnvelope(envelope);
  return request.post(WEBHOOK_URL, { headers, data: payload });
}

/**
 * High-level convenience for UI tests: seeds a Resend fixture and posts the
 * matching signed webhook event in one call, returning the created ticket.
 */
export async function seedTicketViaWebhook(
  request: APIRequestContext,
  overrides: Partial<ResendEmailFixture> = {},
) {
  const fixture = makeEmailFixture({ id: randomUUID(), message_id: randomUUID(), ...overrides });
  await seedResendEmail(request, fixture);

  const response = await postSignedEnvelope(request, makeReceivedEnvelope(fixture));
  if (response.status() !== 201) {
    throw new Error(`Failed to seed ticket via webhook: ${response.status()}`);
  }

  const { ticket } = await response.json();
  return ticket as {
    id: string;
    subject: string;
    body: string;
    bodyHtml: string | null;
    senderName: string;
    senderEmail: string;
    status: string;
    category: string | null;
    receivedAt: string;
    createdAt: string;
    updatedAt: string;
    assignedTo: { id: string; name: string } | null;
  };
}
