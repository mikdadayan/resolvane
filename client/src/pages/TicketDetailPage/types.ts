import type { ReplySenderType } from "@helpdesk/core";
import type { Ticket } from "@helpdesk/core";

export type TicketDetail = Ticket & {
  body: string;
  updatedAt: string;
};

export type AssignableUser = { id: string; name: string };

export type Reply = {
  id: string;
  body: string;
  senderType: ReplySenderType;
  createdAt: string;
  author: { id: string; name: string } | null;
};
