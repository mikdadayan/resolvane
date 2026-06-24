import { Router, type RequestHandler } from "express";
import {
  assignTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  TICKETS_PAGE_SIZE,
} from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { ticketSelect } from "../lib/ticket-select";
import { validateBody, validateQuery } from "../lib/validation";
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
  const ticket = await prisma.ticket.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: ticketSelect,
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
};

export const assignTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const data = validateBody(assignTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
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
    where: { id: req.params.id },
    data: { assignedToId: data.assignedToId },
    select: ticketSelect,
  });

  res.json(updated);
};

export const updateTicket: RequestHandler<{ id: string }> = async (req, res) => {
  const data = validateBody(updateTicketSchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(data.status && { status: data.status as TicketStatus }),
      ...(data.category && { category: data.category as TicketCategory }),
    },
    select: ticketSelect,
  });

  res.json(updated);
};

router.get("/", requireAuth, listTickets);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id", requireAuth, updateTicket);
router.patch("/:id/assign", requireAuth, assignTicket);

export default router;
