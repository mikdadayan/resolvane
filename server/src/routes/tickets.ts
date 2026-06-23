import { Router, type RequestHandler } from "express";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { ticketSelect } from "../lib/ticket-select";

const router = Router();

const listTickets: RequestHandler = async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { deletedAt: null },
    select: ticketSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
};

router.get("/", requireAuth, listTickets);

export default router;
