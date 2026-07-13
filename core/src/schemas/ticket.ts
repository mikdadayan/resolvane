import { z } from "zod";

export const TicketStatus = {
  new: "new",
  processing: "processing",
  open: "open",
  resolved: "resolved",
  closed: "closed",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const VISIBLE_TICKET_STATUSES = [
  TicketStatus.new,
  TicketStatus.open,
  TicketStatus.resolved,
  TicketStatus.closed,
] as const;

export const AGENT_SETTABLE_TICKET_STATUSES = [TicketStatus.open, TicketStatus.resolved, TicketStatus.closed] as const;

export const TicketCategory = {
  generalQuestion: "general_question",
  technicalQuestion: "technical_question",
  refundRequest: "refund_request",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

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

export const TicketSortBy = {
  subject: "subject",
  senderName: "senderName",
  status: "status",
  category: "category",
  receivedAt: "receivedAt",
} as const;

export type TicketSortBy = (typeof TicketSortBy)[keyof typeof TicketSortBy];

export const TICKETS_PAGE_SIZE = 10;

export const listTicketsQuerySchema = z.object({
  sortBy: z.enum(Object.values(TicketSortBy) as [string, ...string[]]).default(TicketSortBy.receivedAt),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().min(1).optional(),
  status: z.enum(VISIBLE_TICKET_STATUSES as unknown as [string, ...string[]]).optional(),
  category: z.enum(Object.values(TicketCategory) as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().trim().min(1, "assignedToId is required").nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketSchema = z
  .object({
    status: z.enum(AGENT_SETTABLE_TICKET_STATUSES as unknown as [string, ...string[]]).optional(),
    category: z.enum(Object.values(TicketCategory) as [string, ...string[]]).optional(),
  })
  .refine((data) => data.status !== undefined || data.category !== undefined, {
    message: "Provide a status or category to update",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
