import { test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";
import { ErrorCode } from "../lib/errors";
import { replySelect } from "../lib/reply-select";
import { ticketSelect } from "../lib/ticket-select";
import { Prisma } from "../generated/prisma/client";

const TICKET_ID = "52671c5a-2b9d-4308-886d-9a5da4c68b7d";
const AI_AGENT_ID = "ai-agent-id";

const ticketFindFirst = mock();
const ticketCreate = mock();
const ticketUpdate = mock();
const ticketReplyFindFirst = mock();
const ticketReplyCreate = mock();
const transaction = mock(async (fn: (tx: unknown) => unknown) =>
  await fn({ ticket: { update: ticketUpdate }, ticketReply: { create: ticketReplyCreate } })
);
const emailsReceivingGet = mock();
const bossSend = mock(() => Promise.resolve());

mock.module("../lib/prisma", () => ({
  prisma: {
    ticket: { findFirst: ticketFindFirst, create: ticketCreate },
    ticketReply: { findFirst: ticketReplyFindFirst },
    $transaction: transaction,
  },
}));

mock.module("../lib/resend", () => ({
  resend: { emails: { receiving: { get: emailsReceivingGet } } },
}));

mock.module("../lib/boss", () => ({ boss: { send: bossSend } }));

const { inboundEmail } = await import("./webhooks");

function makeRes() {
  const res = {} as Response;
  res.status = mock(() => res) as never;
  res.json = mock(() => res) as never;
  return res;
}

function makeReq(resendEvent: unknown): Request {
  return { resendEvent } as unknown as Request;
}

function receivedEvent(messageId: string, emailId: string) {
  return { type: "email.received" as const, data: { message_id: messageId, email_id: emailId } };
}

beforeEach(() => {
  ticketFindFirst.mockReset();
  ticketCreate.mockReset();
  ticketUpdate.mockReset();
  ticketReplyFindFirst.mockReset();
  ticketReplyCreate.mockReset();
  transaction.mockClear();
  emailsReceivingGet.mockReset();
  bossSend.mockClear();
});

test("ignores non-email.received events", async () => {
  const res = makeRes();

  await inboundEmail(makeReq({ type: "email.sent", data: {} }), res, () => {});

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ ignored: "email.sent" });
  expect(ticketFindFirst).not.toHaveBeenCalled();
  expect(ticketReplyFindFirst).not.toHaveBeenCalled();
  expect(emailsReceivingGet).not.toHaveBeenCalled();
});

test("returns the existing ticket when the message id was already recorded as a ticket", async () => {
  const existing = { id: TICKET_ID };
  ticketFindFirst.mockResolvedValueOnce(existing);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-1", "email-1")), res, () => {});

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ ticket: existing });
  expect(emailsReceivingGet).not.toHaveBeenCalled();
});

test("returns the existing reply when the message id was already recorded as a reply", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  const existingReply = { id: "reply-1" };
  ticketReplyFindFirst.mockResolvedValueOnce(existingReply);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-1", "email-1")), res, () => {});

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ reply: existingReply });
  expect(emailsReceivingGet).not.toHaveBeenCalled();
});

test("throws RESEND_FETCH_FAILED when the Resend fetch fails", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  emailsReceivingGet.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
  const res = makeRes();

  await expect(inboundEmail(makeReq(receivedEvent("msg-1", "email-1")), res, () => {})).rejects.toMatchObject({
    code: ErrorCode.RESEND_FETCH_FAILED,
    statusCode: 502,
  });
});

test("creates a new ticket and enqueues both jobs when there is no thread match", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-1",
      from: "Jane Doe <jane@example.com>",
      subject: "Help",
      text: "I need help",
      html: null,
      message_id: "msg-1",
      created_at: "2026-07-01T00:00:00.000Z",
      headers: null,
    },
    error: null,
  });
  const createdTicket = { id: TICKET_ID, subject: "Help" };
  ticketCreate.mockResolvedValueOnce(createdTicket);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-1", "email-1")), res, () => {});

  expect(ticketFindFirst).toHaveBeenCalledTimes(1);
  expect(ticketCreate).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ ticket: createdTicket });
  expect(bossSend).toHaveBeenCalledTimes(2);
});

test("falls back to creating a new ticket when headers have no threading info", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-6",
      from: "Jane Doe <jane@example.com>",
      subject: "Help",
      text: "body",
      html: null,
      message_id: "msg-6",
      created_at: "2026-07-06T00:00:00.000Z",
      headers: { "x-foo": "bar" },
    },
    error: null,
  });
  const createdTicket = { id: TICKET_ID };
  ticketCreate.mockResolvedValueOnce(createdTicket);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-6", "email-6")), res, () => {});

  expect(ticketFindFirst).toHaveBeenCalledTimes(1);
  expect(ticketCreate).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ ticket: createdTicket });
});

test("thread match on an already-open ticket only creates the reply", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const matchedTicket = { id: TICKET_ID, status: "open", assignedTo: null };
  ticketFindFirst.mockResolvedValueOnce(matchedTicket);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-2",
      from: "Jane Doe <jane@example.com>",
      subject: "Re: Help",
      text: "Still broken",
      html: null,
      message_id: "msg-2",
      created_at: "2026-07-02T00:00:00.000Z",
      headers: { References: "<msg-1@example.com>" },
    },
    error: null,
  });
  const createdReply = { id: "reply-2", body: "Still broken" };
  ticketReplyCreate.mockResolvedValueOnce(createdReply);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-2", "email-2")), res, () => {});

  expect(ticketReplyCreate).toHaveBeenCalledWith({
    data: {
      ticketId: TICKET_ID,
      senderType: "customer",
      authorId: null,
      body: "Still broken",
      messageId: "msg-2",
    },
    select: replySelect,
  });
  expect(ticketUpdate).not.toHaveBeenCalled();
  expect(bossSend).not.toHaveBeenCalled();
  expect(ticketCreate).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ reply: createdReply });
});

test("reopens a resolved ticket and clears an AI assignment", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const matchedTicket = {
    id: TICKET_ID,
    status: "resolved",
    assignedTo: { id: AI_AGENT_ID, name: "AI Assistant" },
  };
  ticketFindFirst.mockResolvedValueOnce(matchedTicket);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-3",
      from: "Jane Doe <jane@example.com>",
      subject: "Re: Help",
      text: "Not fixed",
      html: null,
      message_id: "msg-3",
      created_at: "2026-07-03T00:00:00.000Z",
      headers: { References: "<msg-1@example.com>" },
    },
    error: null,
  });
  ticketReplyCreate.mockResolvedValueOnce({ id: "reply-3" });
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-3", "email-3")), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { status: "open", resolvedAt: null, assignedToId: null },
  });
});

test("reopens a closed ticket but keeps a human assignee", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const matchedTicket = {
    id: TICKET_ID,
    status: "closed",
    assignedTo: { id: "human-1", name: "Agent Smith" },
  };
  ticketFindFirst.mockResolvedValueOnce(matchedTicket);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-4",
      from: "Jane Doe <jane@example.com>",
      subject: "Re: Help",
      text: "Reopening",
      html: null,
      message_id: "msg-4",
      created_at: "2026-07-04T00:00:00.000Z",
      headers: { References: "<msg-1@example.com>" },
    },
    error: null,
  });
  ticketReplyCreate.mockResolvedValueOnce({ id: "reply-4" });
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-4", "email-4")), res, () => {});

  expect(ticketUpdate).toHaveBeenCalledWith({
    where: { id: TICKET_ID },
    data: { status: "open", resolvedAt: null },
  });
});

test("looks up a thread match by any referenced id, oldest ticket wins, excluding soft-deleted", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const matchedTicket = { id: TICKET_ID, status: "open", assignedTo: null };
  ticketFindFirst.mockResolvedValueOnce(matchedTicket);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-5",
      from: "Jane Doe <jane@example.com>",
      subject: "Re: Help",
      text: "body",
      html: null,
      message_id: "msg-5",
      created_at: "2026-07-05T00:00:00.000Z",
      headers: { References: "<a@example.com> <b@example.com>" },
    },
    error: null,
  });
  ticketReplyCreate.mockResolvedValueOnce({ id: "reply-5" });
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-5", "email-5")), res, () => {});

  expect(ticketFindFirst).toHaveBeenLastCalledWith({
    where: { messageId: { in: ["<a@example.com>", "<b@example.com>"] }, deletedAt: null },
    orderBy: { receivedAt: "asc" },
    select: ticketSelect,
  });
});

test("recovers from a concurrent redelivery race during reply creation", async () => {
  ticketFindFirst.mockResolvedValueOnce(null);
  ticketReplyFindFirst.mockResolvedValueOnce(null);
  const matchedTicket = { id: TICKET_ID, status: "open", assignedTo: null };
  ticketFindFirst.mockResolvedValueOnce(matchedTicket);
  emailsReceivingGet.mockResolvedValueOnce({
    data: {
      email_id: "email-7",
      from: "Jane Doe <jane@example.com>",
      subject: "Re: Help",
      text: "body",
      html: null,
      message_id: "msg-7",
      created_at: "2026-07-07T00:00:00.000Z",
      headers: { References: "<msg-1@example.com>" },
    },
    error: null,
  });
  ticketReplyCreate.mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    })
  );
  const raceWinnerReply = { id: "reply-7" };
  ticketReplyFindFirst.mockResolvedValueOnce(raceWinnerReply);
  const res = makeRes();

  await inboundEmail(makeReq(receivedEvent("msg-7", "email-7")), res, () => {});

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ reply: raceWinnerReply });
});
