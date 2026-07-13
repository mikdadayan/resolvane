import { Router, type RequestHandler } from "express";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { prisma } from "../lib/prisma";
import { resend } from "../lib/resend";
import { ticketSelect } from "../lib/ticket-select";
import { boss } from "../lib/boss";
import { CLASSIFY_TICKET_QUEUE } from "../workers/classify-ticket-worker";
import { AUTO_RESOLVE_TICKET_QUEUE } from "../workers/auto-resolve-ticket-worker";
import { AI_AGENT_ID } from "../lib/ai-agent";

const router = Router();

function parseFromAddress(from: string): { senderName: string; senderEmail: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (!match) {
    return { senderName: from, senderEmail: from };
  }

  const senderName = match[1]!.trim().replace(/^"|"$/g, "");
  const senderEmail = match[2]!.trim();
  return { senderName: senderName || senderEmail, senderEmail };
}

const inboundEmail: RequestHandler = async (req, res) => {
  const event = req.resendEvent!;

  if (event.type !== "email.received") {
    res.status(200).json({ ignored: event.type });
    return;
  }

  const existing = await prisma.ticket.findFirst({
    where: { messageId: event.data.message_id },
    select: ticketSelect,
  });
  if (existing) {
    res.status(200).json({ ticket: existing });
    return;
  }

  const { data: email, error } = await resend.emails.receiving.get(event.data.email_id);
  if (error || !email) {
    res.status(502).json({ error: "Failed to fetch email content from Resend" });
    return;
  }

  const { senderName, senderEmail } = parseFromAddress(email.from);

  const ticket = await prisma.ticket.create({
    data: {
      subject: email.subject,
      body: email.text ?? "",
      bodyHtml: email.html ?? null,
      senderName,
      senderEmail,
      messageId: email.message_id,
      receivedAt: new Date(email.created_at),
      assignedToId: AI_AGENT_ID,
    },
    select: ticketSelect,
  });

  res.status(201).json({ ticket });

  boss.send(CLASSIFY_TICKET_QUEUE, { id: ticket.id, subject: ticket.subject, body: ticket.body }).catch(console.error);
  boss
    .send(AUTO_RESOLVE_TICKET_QUEUE, {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      senderName: ticket.senderName,
      senderEmail: ticket.senderEmail,
      messageId: email.message_id,
    })
    .catch(console.error);
};

router.post("/inbound-email", requireWebhookSecret, inboundEmail);

export default router;
