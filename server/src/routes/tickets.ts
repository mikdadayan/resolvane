import { Router, type RequestHandler } from "express";
import {
  assignTicketSchema,
  createReplySchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  ReplySenderType,
  TICKETS_PAGE_SIZE,
} from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { replySelect } from "../lib/reply-select";
import { ticketSelect } from "../lib/ticket-select";
import { validateBody, validateId, validateQuery } from "../lib/validation";
import type { TicketStatus, TicketCategory } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";

const router = Router();

const listTickets: RequestHandler = async (req, res) => {
  const query = validateQuery(listTicketsQuerySchema, req.query, res);
  if (!query) return;

  const where: Prisma.ticketWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status as TicketStatus }),
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

router.get("/", requireAuth, listTickets);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id", requireAuth, updateTicket);
router.patch("/:id/assign", requireAuth, assignTicket);
router.get("/:id/replies", requireAuth, listReplies);
router.post("/:id/replies", requireAuth, createReply);

export default router;
