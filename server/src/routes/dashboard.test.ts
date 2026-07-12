import { test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";

const ticketCount = mock();
const ticketFindMany = mock();
const ticketGroupBy = mock();
const userFindMany = mock();
const queryRaw = mock();

mock.module("../lib/prisma", () => ({
  prisma: {
    ticket: { count: ticketCount, findMany: ticketFindMany, groupBy: ticketGroupBy },
    user: { findMany: userFindMany },
    $queryRaw: queryRaw,
  },
}));

const { getDashboardStats, getTicketsByStatus, getTicketsByAssignee } = await import("./dashboard");

function makeRes() {
  const res = {} as Response;
  res.status = mock(() => res) as never;
  res.json = mock(() => res) as never;
  return res;
}

function makeReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

beforeEach(() => {
  ticketCount.mockReset();
  ticketFindMany.mockReset();
  ticketGroupBy.mockReset();
  userFindMany.mockReset();
  queryRaw.mockReset();
});

test("computes all five stats, including percentage and average resolution time", async () => {
  ticketCount
    .mockResolvedValueOnce(20) // totalTickets
    .mockResolvedValueOnce(5) // openTickets
    .mockResolvedValueOnce(10) // resolvedOrClosedCount
    .mockResolvedValueOnce(6); // aiResolvedTickets
  queryRaw.mockResolvedValueOnce([{ avg_ticket_resolution_time_ms: 3 * 60 * 60 * 1000 }]);
  ticketFindMany.mockResolvedValueOnce([]); // recentTickets
  const res = makeRes();

  await getDashboardStats({} as Request, res, () => {});

  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      totalTickets: 20,
      openTickets: 5,
      aiResolvedTickets: 6,
      aiResolvedPercentage: 60,
      avgResolutionTimeMs: 3 * 60 * 60 * 1000,
    })
  );
});

test("returns 0% and null average when there are no resolved/closed tickets", async () => {
  ticketCount
    .mockResolvedValueOnce(3)
    .mockResolvedValueOnce(3)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0);
  queryRaw.mockResolvedValueOnce([{ avg_ticket_resolution_time_ms: null }]);
  ticketFindMany.mockResolvedValueOnce([]);
  const res = makeRes();

  await getDashboardStats({} as Request, res, () => {});

  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ aiResolvedPercentage: 0, avgResolutionTimeMs: null })
  );
});

test("buckets recent tickets into a 30-day, oldest-first tickets-per-day series", async () => {
  ticketCount.mockResolvedValue(0);
  queryRaw.mockResolvedValueOnce([{ avg_ticket_resolution_time_ms: null }]);
  const today = new Date();
  ticketFindMany.mockResolvedValueOnce([{ receivedAt: today }, { receivedAt: today }]); // recentTickets
  const res = makeRes();

  await getDashboardStats({} as Request, res, () => {});

  const { ticketsPerDay } = (res.json as ReturnType<typeof mock>).mock.calls[0]![0] as {
    ticketsPerDay: { date: string; count: number }[];
  };

  expect(ticketsPerDay).toHaveLength(30);
  expect(ticketsPerDay[0]!.date < ticketsPerDay[29]!.date).toBe(true);
  expect(ticketsPerDay[29]).toEqual({ date: today.toISOString().slice(0, 10), count: 2 });
  expect(ticketsPerDay.slice(0, 29).every((d) => d.count === 0)).toBe(true);
});

test("getTicketsByStatus zero-fills statuses missing from the grouped result", async () => {
  ticketGroupBy.mockResolvedValueOnce([
    { status: "open", _count: { _all: 3 } },
    { status: "resolved", _count: { _all: 2 } },
  ]);
  const res = makeRes();

  await getTicketsByStatus(makeReq(), res, () => {});

  expect(res.json).toHaveBeenCalledWith({
    ticketsByStatus: [
      { status: "new", count: 0 },
      { status: "processing", count: 0 },
      { status: "open", count: 3 },
      { status: "resolved", count: 2 },
      { status: "closed", count: 0 },
    ],
  });
});

test("getTicketsByStatus defaults to a 30-day receivedAt window", async () => {
  ticketGroupBy.mockResolvedValueOnce([]);
  const res = makeRes();

  await getTicketsByStatus(makeReq(), res, () => {});

  const { where } = ticketGroupBy.mock.calls[0]![0] as {
    where: { receivedAt?: { gte: Date }; deletedAt: null; category?: string };
  };
  expect(where.deletedAt).toBeNull();
  expect(where.category).toBeUndefined();
  expect(where.receivedAt).toBeDefined();
  const daysAgo = Math.round((Date.now() - where.receivedAt!.gte.getTime()) / 86_400_000);
  expect(daysAgo).toBeGreaterThanOrEqual(29);
  expect(daysAgo).toBeLessThanOrEqual(30);
});

test("getTicketsByStatus omits the receivedAt filter for range=all", async () => {
  ticketGroupBy.mockResolvedValueOnce([]);
  const res = makeRes();

  await getTicketsByStatus(makeReq({ range: "all" }), res, () => {});

  const { where } = ticketGroupBy.mock.calls[0]![0] as { where: { receivedAt?: unknown } };
  expect(where.receivedAt).toBeUndefined();
});

test("getTicketsByStatus filters by category when provided", async () => {
  ticketGroupBy.mockResolvedValueOnce([]);
  const res = makeRes();

  await getTicketsByStatus(makeReq({ range: "7d", category: "refund_request" }), res, () => {});

  const { where } = ticketGroupBy.mock.calls[0]![0] as { where: { category?: string } };
  expect(where.category).toBe("refund_request");
});

test("getTicketsByStatus returns 400 for an invalid range", async () => {
  const res = makeRes();

  await getTicketsByStatus(makeReq({ range: "bogus" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketGroupBy).not.toHaveBeenCalled();
});

test("getTicketsByAssignee resolves assignee names and sorts by count descending", async () => {
  ticketGroupBy.mockResolvedValueOnce([
    { assignedToId: "user-1", _count: { _all: 2 } },
    { assignedToId: "user-2", _count: { _all: 5 } },
    { assignedToId: null, _count: { _all: 3 } },
  ]);
  userFindMany.mockResolvedValueOnce([
    { id: "user-1", name: "Agent Smith" },
    { id: "user-2", name: "Agent Jones" },
  ]);
  const res = makeRes();

  await getTicketsByAssignee(makeReq(), res, () => {});

  expect(userFindMany).toHaveBeenCalledWith({
    where: { id: { in: ["user-1", "user-2"] } },
    select: { id: true, name: true },
  });
  expect(res.json).toHaveBeenCalledWith({
    ticketsByAssignee: [
      { assigneeId: "user-2", assigneeName: "Agent Jones", count: 5 },
      { assigneeId: null, assigneeName: "Unassigned", count: 3 },
      { assigneeId: "user-1", assigneeName: "Agent Smith", count: 2 },
    ],
  });
});

test("getTicketsByAssignee excludes tickets assigned to the AI agent", async () => {
  ticketGroupBy.mockResolvedValueOnce([]);
  const res = makeRes();

  await getTicketsByAssignee(makeReq(), res, () => {});

  const { where } = ticketGroupBy.mock.calls[0]![0] as { where: { assignedToId?: unknown } };
  expect(where.assignedToId).toEqual({ not: "ai-agent-id" });
  expect(userFindMany).not.toHaveBeenCalled();
});

test("getTicketsByAssignee filters by range and category", async () => {
  ticketGroupBy.mockResolvedValueOnce([]);
  const res = makeRes();

  await getTicketsByAssignee(makeReq({ range: "90d", category: "technical_question" }), res, () => {});

  const { where } = ticketGroupBy.mock.calls[0]![0] as {
    where: { receivedAt?: { gte: Date }; category?: string };
  };
  expect(where.category).toBe("technical_question");
  const daysAgo = Math.round((Date.now() - where.receivedAt!.gte.getTime()) / 86_400_000);
  expect(daysAgo).toBeGreaterThanOrEqual(89);
  expect(daysAgo).toBeLessThanOrEqual(90);
});

test("getTicketsByAssignee returns 400 for an invalid range", async () => {
  const res = makeRes();

  await getTicketsByAssignee(makeReq({ range: "bogus" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketGroupBy).not.toHaveBeenCalled();
});
