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
