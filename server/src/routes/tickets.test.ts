import { test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";
import { ticketSelect } from "../lib/ticket-select";

const ticketFindFirst = mock();
const ticketUpdate = mock();
const userFindFirst = mock();

mock.module("../lib/prisma", () => ({
  prisma: {
    ticket: { findFirst: ticketFindFirst, update: ticketUpdate },
    user: { findFirst: userFindFirst },
  },
}));

const { assignTicket, updateTicket } = await import("./tickets");

function makeRes() {
  const res = {} as Response;
  res.status = mock(() => res) as never;
  res.json = mock(() => res) as never;
  return res;
}

function makeReq(id: string, body: unknown): Request<{ id: string }> {
  return { params: { id }, body } as unknown as Request<{ id: string }>;
}

beforeEach(() => {
  ticketFindFirst.mockReset();
  ticketUpdate.mockReset();
  userFindFirst.mockReset();
});

test("assignTicket returns 400 when assignedToId is missing from the body", async () => {
  const res = makeRes();

  await assignTicket(makeReq("ticket-1", {}), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("assignTicket returns 404 when the ticket does not exist", async () => {
  ticketFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await assignTicket(makeReq("missing-ticket", { assignedToId: "user-1" }), res, () => {});

  expect(ticketFindFirst).toHaveBeenCalledWith({
    where: { id: "missing-ticket", deletedAt: null },
  });
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: "Ticket not found" });
  expect(userFindFirst).not.toHaveBeenCalled();
  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("assignTicket returns 400 when the assignee does not exist", async () => {
  ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
  userFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await assignTicket(makeReq("ticket-1", { assignedToId: "missing-user" }), res, () => {});

  expect(userFindFirst).toHaveBeenCalledWith({
    where: { id: "missing-user", deletedAt: null },
  });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: "Assignee not found" });
  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("assignTicket assigns the ticket to an existing user", async () => {
  ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
  userFindFirst.mockResolvedValue({ id: "user-1" });
  const updatedTicket = { id: "ticket-1", assignedTo: { id: "user-1", name: "Agent Smith" } };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await assignTicket(makeReq("ticket-1", { assignedToId: "user-1" }), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: "ticket-1" },
    data: { assignedToId: "user-1" },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("assignTicket unassigns the ticket without looking up an assignee", async () => {
  ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
  const updatedTicket = { id: "ticket-1", assignedTo: null };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await assignTicket(makeReq("ticket-1", { assignedToId: null }), res, () => {});

  expect(userFindFirst).not.toHaveBeenCalled();
  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: "ticket-1" },
    data: { assignedToId: null },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("updateTicket returns 400 when neither status nor category is provided", async () => {
  const res = makeRes();

  await updateTicket(makeReq("ticket-1", {}), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("updateTicket returns 404 when the ticket does not exist", async () => {
  ticketFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await updateTicket(makeReq("missing-ticket", { status: "resolved" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: "Ticket not found" });
  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("updateTicket updates only the status when category is omitted", async () => {
  ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
  const updatedTicket = { id: "ticket-1", status: "resolved" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(makeReq("ticket-1", { status: "resolved" }), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: "ticket-1" },
    data: { status: "resolved" },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("updateTicket updates both status and category when both are provided", async () => {
  ticketFindFirst.mockResolvedValue({ id: "ticket-1" });
  const updatedTicket = { id: "ticket-1", status: "closed", category: "refund_request" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(
    makeReq("ticket-1", { status: "closed", category: "refund_request" }),
    res,
    () => {}
  );

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: "ticket-1" },
    data: { status: "closed", category: "refund_request" },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});
