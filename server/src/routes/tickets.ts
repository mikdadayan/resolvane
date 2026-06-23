import { Router, type RequestHandler } from "express";
import { listTicketsQuerySchema } from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { ticketSelect } from "../lib/ticket-select";
import { validateQuery } from "../lib/validation";

const router = Router();

const listTickets: RequestHandler = async (req, res) => {
  const query = validateQuery(listTicketsQuerySchema, req.query, res);
  if (!query) return;

  const tickets = await prisma.ticket.findMany({
    where: { deletedAt: null },
    select: ticketSelect,
    orderBy: { [query.sortBy]: query.sortOrder },
  });
  res.json({ tickets });
};

router.get("/", requireAuth, listTickets);

export default router;
