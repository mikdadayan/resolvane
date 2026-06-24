import type { TicketStatus, TicketCategory } from "@helpdesk/core";

export type Ticket = {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  receivedAt: string;
  assignedTo: { id: string; name: string } | null;
};
