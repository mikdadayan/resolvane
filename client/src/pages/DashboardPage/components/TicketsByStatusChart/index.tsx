import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart } from "recharts";
import { DashboardRange, TicketCategory, TicketStatus } from "@helpdesk/core";
import type { TicketsByStatus } from "@helpdesk/core";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const CATEGORY_FILTER_ALL = "all";

const RANGE_LABELS: Record<DashboardRange, string> = {
  [DashboardRange.last7Days]: "Last 7 Days",
  [DashboardRange.last30Days]: "Last 30 Days",
  [DashboardRange.last90Days]: "Last 90 Days",
  [DashboardRange.allTime]: "All Time",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.generalQuestion]: "General Question",
  [TicketCategory.technicalQuestion]: "Technical Question",
  [TicketCategory.refundRequest]: "Refund Request",
};

// Fixed categorical hues, one per status identity — never reassigned by filter/rank.
const chartConfig = {
  [TicketStatus.new]: { label: "New", color: "var(--status-new)" },
  [TicketStatus.processing]: { label: "Processing", color: "var(--status-processing)" },
  [TicketStatus.open]: { label: "Open", color: "var(--status-open)" },
  [TicketStatus.resolved]: { label: "Resolved", color: "var(--status-resolved)" },
  [TicketStatus.closed]: { label: "Closed", color: "var(--status-closed)" },
} satisfies ChartConfig;

type TicketsByStatusResponse = {
  ticketsByStatus: TicketsByStatus[];
};

async function fetchTicketsByStatus(
  range: DashboardRange,
  category: TicketCategory | typeof CATEGORY_FILTER_ALL
): Promise<TicketsByStatusResponse> {
  const res = await axios.get<TicketsByStatusResponse>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/dashboard/tickets-by-status`,
    {
      params: { range, category: category === CATEGORY_FILTER_ALL ? undefined : category },
      withCredentials: true,
    }
  );
  return res.data;
}

export default function TicketsByStatusChart() {
  const [range, setRange] = useState<DashboardRange>(DashboardRange.last30Days);
  const [category, setCategory] = useState<TicketCategory | typeof CATEGORY_FILTER_ALL>(
    CATEGORY_FILTER_ALL
  );

  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard-tickets-by-status", range, category],
    queryFn: () => fetchTicketsByStatus(range, category),
  });

  const chartData = (data?.ticketsByStatus ?? []).filter((d) => d.count > 0);
  const hasData = chartData.length > 0;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Tickets by Status</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as DashboardRange)}>
            <SelectTrigger aria-label="Filter by date range" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DashboardRange).map((value) => (
                <SelectItem key={value} value={value}>
                  {RANGE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(value) => setCategory(value as TicketCategory | typeof CATEGORY_FILTER_ALL)}
          >
            <SelectTrigger aria-label="Filter by category" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CATEGORY_FILTER_ALL}>All Categories</SelectItem>
              {Object.values(TicketCategory).map((value) => (
                <SelectItem key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No tickets in this range.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={50}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" className="flex-wrap" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
