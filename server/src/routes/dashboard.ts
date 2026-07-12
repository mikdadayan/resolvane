import { Router, type RequestHandler } from "express";
import type { Prisma } from "../generated/prisma/client";
import {
  DashboardRange,
  dashboardFilterQuerySchema,
  type DashboardStats,
  type TicketsByAssignee,
  type TicketsByStatus,
  type TicketsPerDay,
} from "@helpdesk/core";
import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../lib/prisma";
import { TicketStatus, type TicketCategory } from "../generated/prisma/enums";
import { validateQuery } from "../lib/validation";
import { AI_AGENT_ID } from "../lib/ai-agent";

const TICKETS_PER_DAY_WINDOW = 30;

const router = Router();

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const RANGE_DAYS: Record<Exclude<DashboardRange, "all">, number> = {
  [DashboardRange.last7Days]: 7,
  [DashboardRange.last30Days]: 30,
  [DashboardRange.last90Days]: 90,
};

function rangeStartFor(range: DashboardRange): Date | null {
  if (range === DashboardRange.allTime) return null;
  const start = startOfUtcDay(new Date());
  start.setUTCDate(start.getUTCDate() - (RANGE_DAYS[range] - 1));
  return start;
}

function buildTicketsPerDay(tickets: { receivedAt: Date }[], rangeStart: Date): TicketsPerDay[] {
  const countsByDay = new Map<string, number>();
  for (let i = 0; i < TICKETS_PER_DAY_WINDOW; i++) {
    const day = new Date(rangeStart);
    day.setUTCDate(day.getUTCDate() + i);
    countsByDay.set(toUtcDateKey(day), 0);
  }

  for (const ticket of tickets) {
    const key = toUtcDateKey(ticket.receivedAt);
    if (countsByDay.has(key)) {
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }
  }

  return Array.from(countsByDay, ([date, count]) => ({ date, count }));
}

export const getDashboardStats: RequestHandler = async (_req, res) => {
  const openWhere: Prisma.ticketWhereInput = { deletedAt: null, status: TicketStatus.open };
  const resolvedOrClosedWhere: Prisma.ticketWhereInput = {
    deletedAt: null,
    status: { in: [TicketStatus.resolved, TicketStatus.closed] },
  };

  const rangeStart = startOfUtcDay(new Date());
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (TICKETS_PER_DAY_WINDOW - 1));

  const [totalTickets, openTickets, resolvedOrClosedCount, aiResolvedTickets, avgResolutionResult, recentTickets] =
    await Promise.all([
      prisma.ticket.count({
        where: { deletedAt: null, status: { not: TicketStatus.processing } },
      }),
      prisma.ticket.count({ where: openWhere }),
      prisma.ticket.count({ where: resolvedOrClosedWhere }),
      // "Resolved by AI" means the ticket is still assigned to the AI agent when it landed in a
      // resolved/closed state — i.e. no human ever took it over. See lib/ai-agent.ts.
      prisma.ticket.count({
        where: { ...resolvedOrClosedWhere, assignedToId: AI_AGENT_ID },
      }),
      // Computed by a Postgres stored function (see prisma/migrations/..._add_avg_resolution_time_function)
      // rather than fetched and averaged in JS.
      prisma.$queryRaw<{ avg_ticket_resolution_time_ms: number | null }[]>`
        SELECT avg_ticket_resolution_time_ms()
      `,
      prisma.ticket.findMany({
        where: { deletedAt: null, receivedAt: { gte: rangeStart } },
        select: { receivedAt: true },
      }),
    ]);

  const aiResolvedPercentage =
    resolvedOrClosedCount > 0 ? (aiResolvedTickets / resolvedOrClosedCount) * 100 : 0;

  const avgResolutionTimeMs = avgResolutionResult[0]?.avg_ticket_resolution_time_ms ?? null;

  const stats: DashboardStats = {
    totalTickets,
    openTickets,
    aiResolvedTickets,
    aiResolvedPercentage,
    avgResolutionTimeMs,
    ticketsPerDay: buildTicketsPerDay(recentTickets, rangeStart),
  };

  res.json(stats);
};

export const getTicketsByStatus: RequestHandler = async (req, res) => {
  const query = validateQuery(dashboardFilterQuerySchema, req.query, res);
  if (!query) return;

  const rangeStart = rangeStartFor(query.range as DashboardRange);

  const where: Prisma.ticketWhereInput = {
    deletedAt: null,
    ...(rangeStart && { receivedAt: { gte: rangeStart } }),
    ...(query.category && { category: query.category as TicketCategory }),
  };

  const grouped = await prisma.ticket.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  const ticketsByStatus: TicketsByStatus[] = Object.values(TicketStatus).map((status) => ({
    status,
    count: countByStatus.get(status) ?? 0,
  }));

  res.json({ ticketsByStatus });
};

export const getTicketsByAssignee: RequestHandler = async (req, res) => {
  const query = validateQuery(dashboardFilterQuerySchema, req.query, res);
  if (!query) return;

  const rangeStart = rangeStartFor(query.range as DashboardRange);

  const where: Prisma.ticketWhereInput = {
    deletedAt: null,
    // Excludes tickets AI is still handling / resolved on its own — this chart is about
    // human workload distribution. See lib/ai-agent.ts.
    assignedToId: { not: AI_AGENT_ID },
    ...(rangeStart && { receivedAt: { gte: rangeStart } }),
    ...(query.category && { category: query.category as TicketCategory }),
  };

  const grouped = await prisma.ticket.groupBy({
    by: ["assignedToId"],
    where,
    _count: { _all: true },
  });

  const assigneeIds = grouped
    .map((g) => g.assignedToId)
    .filter((id): id is string => id !== null);

  const users =
    assigneeIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
      : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const ticketsByAssignee: TicketsByAssignee[] = grouped
    .map((g) => ({
      assigneeId: g.assignedToId,
      assigneeName: g.assignedToId ? (nameById.get(g.assignedToId) ?? "Unknown") : "Unassigned",
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  res.json({ ticketsByAssignee });
};

router.get("/stats", requireAuth, getDashboardStats);
router.get("/tickets-by-status", requireAuth, getTicketsByStatus);
router.get("/tickets-by-assignee", requireAuth, getTicketsByAssignee);

export default router;
