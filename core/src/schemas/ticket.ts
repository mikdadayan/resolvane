import { z } from "zod";

export const TicketStatus = {
  open: "open",
  resolved: "resolved",
  closed: "closed",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  generalQuestion: "general_question",
  technicalQuestion: "technical_question",
  refundRequest: "refund_request",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const inboundEmailSchema = z.object({
  from: z.string().trim().email("Enter a valid sender email address"),
  fromName: z.string().trim().min(1, "Sender name is required"),
  to: z.string().trim().email("Enter a valid recipient email address"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
  bodyHtml: z.string().trim().min(1).optional(),
  messageId: z.string().trim().min(1).optional(),
  receivedAt: z.coerce.date(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

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
  status: z.enum(Object.values(TicketStatus) as [string, ...string[]]).optional(),
  category: z.enum(Object.values(TicketCategory) as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().trim().min(1, "assignedToId is required").nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
