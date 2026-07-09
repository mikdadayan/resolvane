import { TicketStatus, TicketCategory } from "@helpdesk/core";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.new]: "New",
  [TicketStatus.processing]: "Processing",
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.generalQuestion]: "General Question",
  [TicketCategory.technicalQuestion]: "Technical Question",
  [TicketCategory.refundRequest]: "Refund Request",
};
