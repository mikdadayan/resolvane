import { z } from "zod";
import { TicketStatus, TicketCategory } from "./ticket";

export type TicketsPerDay = {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
};

export type DashboardStats = {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercentage: number; // 0-100
  avgResolutionTimeMs: number | null; // null if no resolved/closed tickets have resolvedAt yet
  ticketsPerDay: TicketsPerDay[]; // last 30 days, oldest first
};

export const DashboardRange = {
  last7Days: "7d",
  last30Days: "30d",
  last90Days: "90d",
  allTime: "all",
} as const;

export type DashboardRange = (typeof DashboardRange)[keyof typeof DashboardRange];

// Shared by both /tickets-by-status and /tickets-by-assignee — same two filter dimensions.
export const dashboardFilterQuerySchema = z.object({
  range: z.enum(Object.values(DashboardRange) as [string, ...string[]]).default(DashboardRange.last30Days),
  category: z.enum(Object.values(TicketCategory) as [string, ...string[]]).optional(),
});

export type DashboardFilterQuery = z.infer<typeof dashboardFilterQuerySchema>;

export type TicketsByStatus = {
  status: TicketStatus;
  count: number;
};

export type TicketsByAssignee = {
  assigneeId: string | null; // null = unassigned
  assigneeName: string;
  count: number;
};
