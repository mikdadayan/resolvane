import { Router, type RequestHandler } from "express";
import { ReplySenderType } from "@resolvane/core";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { AppError, ErrorCode } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { resend } from "../lib/resend";
import { ticketSelect } from "../lib/ticket-select";
import { replySelect } from "../lib/reply-select";
import { extractReferencedMessageIds } from "../lib/email-threading";
import { boss } from "../lib/boss";
import { CLASSIFY_TICKET_QUEUE } from "../workers/classify-ticket-worker";
import { AUTO_RESOLVE_TICKET_QUEUE } from "../workers/auto-resolve-ticket-worker";
import { AI_AGENT_ID } from "../lib/ai-agent";
import { TicketStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";

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

const isUniqueConstraintViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export const inboundEmail: RequestHandler = async (req, res) => {
  const event = req.resendEvent!;

  if (event.type !== "email.received") {
    res.status(200).json({ ignored: event.type });
    return;
  }

  // Cheap idempotency checks, before the expensive Resend fetch below — a ticket already
  // recorded for this exact message id means this is a webhook redelivery of a ticket-creating
  // email; a reply already recorded for it means it's a redelivery of a thread reply.
  const [existingTicket, existingReply] = await Promise.all([
    prisma.ticket.findFirst({
      where: { messageId: event.data.message_id },
      select: ticketSelect,
    }),
    prisma.ticketReply.findFirst({
      where: { messageId: event.data.message_id },
      select: replySelect,
    }),
  ]);
  if (existingTicket) {
    res.status(200).json({ ticket: existingTicket });
    return;
  }
  if (existingReply) {
    res.status(200).json({ reply: existingReply });
    return;
  }

  const { data: email, error } = await resend.emails.receiving.get(event.data.email_id);
  if (error || !email) throw new AppError(ErrorCode.RESEND_FETCH_FAILED);

  // Thread detection — only possible after the full fetch, since raw headers (References /
  // In-Reply-To) aren't present on the webhook event payload itself.
  const referencedIds = extractReferencedMessageIds(email.headers);
  const threadTicket = referencedIds.length
    ? await prisma.ticket.findFirst({
        // deletedAt: null is deliberate here even though the dedup check above doesn't filter it —
        // that check only ever returns a cached read, while this one writes (creates a reply,
        // potentially reopens the ticket), so silently resurrecting a soft-deleted ticket is a
        // bigger behavior change worth preventing.
        where: { messageId: { in: referencedIds }, deletedAt: null },
        // Deterministic tie-break on the rare chance multiple referenced ids match different
        // tickets (e.g. a merged/forwarded thread) — the oldest matching ticket wins.
        orderBy: { receivedAt: "asc" },
        select: ticketSelect,
      })
    : null;

  if (threadTicket) {
    const wasResolvedOrClosed =
      threadTicket.status === TicketStatus.resolved || threadTicket.status === TicketStatus.closed;

    try {
      const reply = await prisma.$transaction(async (tx) => {
        const created = await tx.ticketReply.create({
          data: {
            ticketId: threadTicket.id,
            senderType: ReplySenderType.customer,
            authorId: null,
            body: email.text ?? "",
            messageId: email.message_id,
          },
          select: replySelect,
        });

        if (wasResolvedOrClosed) {
          await tx.ticket.update({
            where: { id: threadTicket.id },
            data: {
              status: TicketStatus.open,
              resolvedAt: null,
              ...(threadTicket.assignedTo?.id === AI_AGENT_ID && { assignedToId: null }),
            },
          });
        }

        return created;
      });

      res.status(201).json({ reply });
    } catch (err) {
      // A concurrent redelivery of the same email created the reply between the pre-check above
      // and this create — treat it exactly like the pre-check dedup case instead of a 500.
      if (isUniqueConstraintViolation(err)) {
        const reply = await prisma.ticketReply.findFirst({
          where: { messageId: email.message_id },
          select: replySelect,
        });
        res.status(200).json({ reply });
        return;
      }
      throw err;
    }
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
