import { test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";
import { ErrorCode } from "../lib/errors";
import { replySelect } from "../lib/reply-select";
import { ticketSelect } from "../lib/ticket-select";

const TICKET_ID = "52671c5a-2b9d-4308-886d-9a5da4c68b7d";
const OTHER_TICKET_ID = "4f871701-a882-40a1-836e-6a8b13f319d1";

const ticketFindFirst = mock();
const ticketUpdate = mock();
const userFindFirst = mock();
const ticketReplyCreate = mock();

mock.module("../lib/prisma", () => ({
  prisma: {
    ticket: { findFirst: ticketFindFirst, update: ticketUpdate },
    user: { findFirst: userFindFirst },
    ticketReply: { create: ticketReplyCreate },
  },
}));

const { assignTicket, updateTicket, createReply } = await import("./tickets");

function makeRes() {
  const res = {} as Response;
  res.status = mock(() => res) as never;
  res.json = mock(() => res) as never;
  return res;
}

function makeReq(
  id: string,
  body: unknown,
  user: { id: string } = { id: "author-1" }
): Request<{ id: string }> {
  return { params: { id }, body, user } as unknown as Request<{ id: string }>;
}

beforeEach(() => {
  ticketFindFirst.mockReset();
  ticketUpdate.mockReset();
  userFindFirst.mockReset();
  ticketReplyCreate.mockReset();
});

test("assignTicket returns 404 when the id is not a valid uuid", async () => {
  const res = makeRes();

  await assignTicket(makeReq("not-a-uuid", { assignedToId: "user-1" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ error: "Ticket not found" });
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("assignTicket returns 400 when assignedToId is missing from the body", async () => {
  const res = makeRes();

  await assignTicket(makeReq(TICKET_ID, {}), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("assignTicket returns 404 when the ticket does not exist", async () => {
  ticketFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await expect(
    assignTicket(makeReq(OTHER_TICKET_ID, { assignedToId: "user-1" }), res, () => {})
  ).rejects.toMatchObject({
    statusCode: 404,
    code: ErrorCode.TICKET_NOT_FOUND,
    message: "Ticket not found",
  });

  expect(ticketFindFirst).toHaveBeenCalledWith({
    where: { id: OTHER_TICKET_ID, deletedAt: null },
  });
  expect(userFindFirst).not.toHaveBeenCalled();
  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("assignTicket returns 400 when the assignee does not exist", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID });
  userFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await expect(
    assignTicket(makeReq(TICKET_ID, { assignedToId: "missing-user" }), res, () => {})
  ).rejects.toMatchObject({
    statusCode: 400,
    code: ErrorCode.ASSIGNEE_NOT_FOUND,
    message: "Assignee not found",
  });

  expect(userFindFirst).toHaveBeenCalledWith({
    where: { id: "missing-user", deletedAt: null },
  });
  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("assignTicket assigns the ticket to an existing user", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID });
  userFindFirst.mockResolvedValue({ id: "user-1" });
  const updatedTicket = { id: TICKET_ID, assignedTo: { id: "user-1", name: "Agent Smith" } };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await assignTicket(makeReq(TICKET_ID, { assignedToId: "user-1" }), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { assignedToId: "user-1" },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("assignTicket unassigns the ticket without looking up an assignee", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID });
  const updatedTicket = { id: TICKET_ID, assignedTo: null };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await assignTicket(makeReq(TICKET_ID, { assignedToId: null }), res, () => {});

  expect(userFindFirst).not.toHaveBeenCalled();
  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { assignedToId: null },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("updateTicket returns 404 when the id is not a valid uuid", async () => {
  const res = makeRes();

  await updateTicket(makeReq("not-a-uuid", { status: "resolved" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(404);
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("updateTicket returns 400 when neither status nor category is provided", async () => {
  const res = makeRes();

  await updateTicket(makeReq(TICKET_ID, {}), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketFindFirst).not.toHaveBeenCalled();
});

test("updateTicket returns 404 when the ticket does not exist", async () => {
  ticketFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await expect(
    updateTicket(makeReq(OTHER_TICKET_ID, { status: "resolved" }), res, () => {})
  ).rejects.toMatchObject({
    statusCode: 404,
    code: ErrorCode.TICKET_NOT_FOUND,
    message: "Ticket not found",
  });

  expect(ticketUpdate).not.toHaveBeenCalled();
});

test("updateTicket updates only the status when category is omitted", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID, status: "open" });
  const updatedTicket = { id: TICKET_ID, status: "resolved" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(makeReq(TICKET_ID, { status: "resolved" }), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { status: "resolved", resolvedAt: expect.any(Date) },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("updateTicket sets resolvedAt when transitioning into resolved", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID, status: "open" });
  const updatedTicket = { id: TICKET_ID, status: "resolved" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(makeReq(TICKET_ID, { status: "resolved" }), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ resolvedAt: expect.any(Date) }) })
  );
});

test("updateTicket does not overwrite resolvedAt when the ticket is already resolved", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID, status: "resolved" });
  const updatedTicket = { id: TICKET_ID, status: "resolved", category: "refund_request" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(
    makeReq(TICKET_ID, { status: "resolved", category: "refund_request" }),
    res,
    () => {}
  );

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { status: "resolved", category: "refund_request" },
    select: ticketSelect,
  });
});

test("updateTicket updates both status and category when both are provided", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID });
  const updatedTicket = { id: TICKET_ID, status: "closed", category: "refund_request" };
  ticketUpdate.mockResolvedValue(updatedTicket);
  const res = makeRes();

  await updateTicket(
    makeReq(TICKET_ID, { status: "closed", category: "refund_request" }),
    res,
    () => {}
  );

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { status: "closed", category: "refund_request" },
    select: ticketSelect,
  });
  expect(res.json).toHaveBeenCalledWith(updatedTicket);
});

test("createReply returns 404 when the id is not a valid uuid", async () => {
  const res = makeRes();

  await createReply(makeReq("not-a-uuid", { body: "Thanks for reaching out" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(404);
  expect(ticketFindFirst).not.toHaveBeenCalled();
  expect(ticketReplyCreate).not.toHaveBeenCalled();
});

test("createReply returns 400 when the body is empty", async () => {
  const res = makeRes();

  await createReply(makeReq(TICKET_ID, { body: "" }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(400);
  expect(ticketFindFirst).not.toHaveBeenCalled();
  expect(ticketReplyCreate).not.toHaveBeenCalled();
});

test("createReply returns 404 when the ticket does not exist", async () => {
  ticketFindFirst.mockResolvedValue(null);
  const res = makeRes();

  await expect(
    createReply(makeReq(OTHER_TICKET_ID, { body: "Thanks for reaching out" }), res, () => {})
  ).rejects.toMatchObject({
    statusCode: 404,
    code: ErrorCode.TICKET_NOT_FOUND,
    message: "Ticket not found",
  });

  expect(ticketReplyCreate).not.toHaveBeenCalled();
});

test("createReply creates a reply authored by the current user", async () => {
  ticketFindFirst.mockResolvedValue({ id: TICKET_ID });
  const createdReply = {
    id: "reply-1",
    body: "Thanks for reaching out",
    senderType: "agent",
    author: { id: "author-1", name: "Agent Smith" },
  };
  ticketReplyCreate.mockResolvedValue(createdReply);
  const res = makeRes();

  await createReply(
    makeReq(TICKET_ID, { body: "Thanks for reaching out" }, { id: "author-1" }),
    res,
    () => {}
  );

  expect(ticketReplyCreate).toHaveBeenCalledWith({
    data: {
      ticketId: TICKET_ID,
      authorId: "author-1",
      senderType: "agent",
      body: "Thanks for reaching out",
    },
    select: replySelect,
  });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(createdReply);
});
