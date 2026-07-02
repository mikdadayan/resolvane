import { Router, type RequestHandler } from "express";
import { inboundEmailSchema } from "@helpdesk/core";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { prisma } from "../lib/prisma";
import { validateBody } from "../lib/validation";
import { ticketSelect } from "../lib/ticket-select";
import { classifyTicket } from "../lib/classify-ticket";

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
    },
    select: ticketSelect,
  });

  res.status(201).json({ ticket });

  setImmediate(() => classifyTicket(ticket.id, ticket.subject, ticket.body).catch(console.error));
};

router.post("/inbound-email", requireWebhookSecret, inboundEmail);

export default router;
