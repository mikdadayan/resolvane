import { Router, type RequestHandler } from "express";
import {
  assignTicketSchema,
  createReplySchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  ReplySenderType,
  TICKETS_PAGE_SIZE,
} from "@helpdesk/core";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { replySelect } from "../lib/reply-select";
import { ticketSelect } from "../lib/ticket-select";
import { validateBody, validateId, validateQuery } from "../lib/validation";
import { TicketStatus, type TicketCategory } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

const router = Router();

const listTickets: RequestHandler = async (req, res) => {
  const query = validateQuery(listTicketsQuerySchema, req.query, res);
  if (!query) return;

  const where: Prisma.ticketWhereInput = {
    deletedAt: null,
    status: query.status ? (query.status as TicketStatus) : { not: TicketStatus.processing },
    ...(query.category && { category: query.category as TicketCategory }),
    ...(query.search && {
      OR: [
        { subject: { contains: query.search, mode: "insensitive" } },
        { senderName: { contains: query.search, mode: "insensitive" } },
        { senderEmail: { contains: query.search, mode: "insensitive" } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: ticketSelect,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * TICKETS_PAGE_SIZE,
      take: TICKETS_PAGE_SIZE,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total });
};

const getTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
    select: ticketSelect,
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
};

export const assignTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const data = validateBody(assignTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (data.assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assignedToId, deletedAt: null },
    });
    if (!assignee) {
      res.status(400).json({ error: "Assignee not found" });
      return;
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { assignedToId: data.assignedToId },
    select: ticketSelect,
  });

  res.json(updated);
};

export const updateTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const data = validateBody(updateTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status as TicketStatus }),
      ...(data.category && { category: data.category as TicketCategory }),
    },
    select: ticketSelect,
  });

  res.json(updated);
};

const listReplies: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.ticketReply.findMany({
    where: { ticketId: id },
    select: replySelect,
    orderBy: { createdAt: "asc" },
  });

  res.json({ replies });
};

export const createReply: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const data = validateBody(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId: id,
      authorId: req.user!.id,
      senderType: ReplySenderType.agent,
      body: data.body,
    },
    select: replySelect,
  });

  res.status(201).json(reply);
};

const summarizeTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
    select: { subject: true, body: true, senderName: true, status: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.ticketReply.findMany({
    where: { ticketId: id },
    select: replySelect,
    orderBy: { createdAt: "asc" },
  });

  const conversation = [
    `Customer (${ticket.senderName}): ${ticket.body}`,
    ...replies.map((r) => {
      const sender =
        r.senderType === ReplySenderType.agent
          ? `Agent (${r.author?.name ?? "Unknown"})`
          : r.senderType === ReplySenderType.ai
            ? "AI Assistant"
            : "Customer";
      return `${sender}: ${r.body}`;
    }),
  ].join("\n\n");

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    system:
      "You are a support team assistant. Summarize the support ticket in 2–4 sentences based on whatever information is available — subject, message body, replies, status, and reply count. " +
      "If the content is unclear or gibberish, describe the ticket's current state using the metadata instead. " +
      "Example for an unclear ticket with no replies: \"The customer submitted a request with unclear details but has not received any responses. Currently, the ticket is open and awaiting further action from support.\" " +
      "Never refuse. Never say information is missing. Always produce a summary.",
    prompt:
      `Subject: ${ticket.subject}\nCustomer: ${ticket.senderName}\nStatus: ${ticket.status}\nReplies: ${replies.length}\n\n${conversation}`,
  });

  res.json({ summary: text });
};

const polishReply: RequestHandler<{ id: string }> = async (req, res) => {
  const id = validateId(req.params.id, res, "Ticket not found");
  if (!id) return;

  const data = validateBody(z.object({ body: z.string().min(1) }), req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    prompt: `You are a support agent assistant. Improve the following customer support reply to make it clearer, more professional, and more empathetic. Keep it concise — no unnecessary filler, padding, or repetition. Preserve the original intent and all specific details. Begin the reply with a greeting using the customer's first name (their full name is: ${ticket.senderName}), for example "Hi [first name]," or "Dear [first name],". End the reply with this exact signature on a new line:\n\nBest regards,\n${req.user!.name}\nhttps://codewithmosh.com\n\nReturn only the improved reply text with the signature — no preamble, no explanation.\n\nTicket subject: ${ticket.subject}\n\nOriginal reply:\n${data.body}`,
  });

  res.json({ body: text });
};

router.get("/", requireAuth, listTickets);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id", requireAuth, updateTicket);
router.patch("/:id/assign", requireAuth, assignTicket);
router.get("/:id/replies", requireAuth, listReplies);
router.post("/:id/replies", requireAuth, createReply);
router.post("/:id/polish-reply", requireAuth, polishReply);
router.post("/:id/summarize", requireAuth, summarizeTicket);

export default router;
