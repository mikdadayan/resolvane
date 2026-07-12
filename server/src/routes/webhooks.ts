import { Router, type RequestHandler } from "express";
import { inboundEmailSchema } from "@helpdesk/core";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { prisma } from "../lib/prisma";
import { validateBody } from "../lib/validation";
import { ticketSelect } from "../lib/ticket-select";
import { boss } from "../lib/boss";
import { CLASSIFY_TICKET_QUEUE } from "../workers/classify-ticket-worker";
import { AUTO_RESOLVE_TICKET_QUEUE } from "../workers/auto-resolve-ticket-worker";
import { AI_AGENT_ID } from "../lib/ai-agent";

const router = Router();

const inboundEmail: RequestHandler = async (req, res) => {
  const data = validateBody(inboundEmailSchema, req.body, res);
  if (!data) return;

  const { from, fromName, subject, body, bodyHtml, messageId, receivedAt } = data;

  if (messageId) {
    const existing = await prisma.ticket.findFirst({
      where: { messageId },
      select: ticketSelect,
    });
    if (existing) {
      res.status(200).json({ ticket: existing });
      return;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body,
      bodyHtml: bodyHtml ?? null,
      senderName: fromName,
      senderEmail: from,
      messageId: messageId ?? null,
      receivedAt,
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
    })
    .catch(console.error);
};

router.post("/inbound-email", requireWebhookSecret, inboundEmail);

export default router;
