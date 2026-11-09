import type { ReplySenderType } from "@resolvane/core";
import type { Ticket } from "@resolvane/core";

export type TicketDetail = Ticket & {
  body: string;
  bodyHtml: string | null;
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
