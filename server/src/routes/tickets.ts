import { Router, type RequestHandler } from "express";
import { listTicketsQuerySchema, TICKETS_PAGE_SIZE } from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { ticketSelect } from "../lib/ticket-select";
import { validateQuery } from "../lib/validation";
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

router.get("/", requireAuth, listTickets);
router.get("/:id", requireAuth, getTicket);

export default router;
