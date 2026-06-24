import { Router, type RequestHandler } from "express";
import { listTicketsQuerySchema } from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { ticketSelect } from "../lib/ticket-select";
import { validateQuery } from "../lib/validation";
import type { TicketStatus, TicketCategory } from "../generated/prisma/enums";

const router = Router();

const listTickets: RequestHandler = async (req, res) => {
  const query = validateQuery(listTicketsQuerySchema, req.query, res);
  if (!query) return;

  const tickets = await prisma.ticket.findMany({
    where: {
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
    },
    select: ticketSelect,
    orderBy: { [query.sortBy]: query.sortOrder },
  });
  res.json({ tickets });
};

router.get("/", requireAuth, listTickets);

export default router;
