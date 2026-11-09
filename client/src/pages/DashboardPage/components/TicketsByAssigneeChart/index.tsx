import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart } from "recharts";
import { DashboardRange, TicketCategory } from "@resolvane/core";
import type { TicketsByAssignee } from "@resolvane/core";
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
const MAX_SLICES = 7;
const CATEGORICAL_SLOTS = 8;
const OTHER_KEY = "other";

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

type TicketsByAssigneeResponse = {
  ticketsByAssignee: TicketsByAssignee[];
};

type Slice = {
  key: string;
  name: string;
  count: number;
};

// Deterministic hue per assignee identity (not by sort rank), so a given agent keeps the same
// color across filter changes even as the rest of the slice set shifts.
function colorSlotFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % CATEGORICAL_SLOTS) + 1;
}

// Beyond the 8 available hues, additional assignees fold into "Other" rather than generating
// more colors.
function toSlices(data: TicketsByAssignee[]): Slice[] {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  if (sorted.length <= MAX_SLICES + 1) {
    return sorted.map((d) => ({ key: d.assigneeId ?? "unassigned", name: d.assigneeName, count: d.count }));
  }

  const shown = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const otherCount = rest.reduce((sum, d) => sum + d.count, 0);

  return [
    ...shown.map((d) => ({ key: d.assigneeId ?? "unassigned", name: d.assigneeName, count: d.count })),
    { key: OTHER_KEY, name: "Other", count: otherCount },
  ];
}

async function fetchTicketsByAssignee(
  range: DashboardRange,
  category: TicketCategory | typeof CATEGORY_FILTER_ALL
): Promise<TicketsByAssigneeResponse> {
  const res = await axios.get<TicketsByAssigneeResponse>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/dashboard/tickets-by-assignee`,
    {
      params: { range, category: category === CATEGORY_FILTER_ALL ? undefined : category },
      withCredentials: true,
    }
  );
  return res.data;
}

export default function TicketsByAssigneeChart() {
  const [range, setRange] = useState<DashboardRange>(DashboardRange.last30Days);
  const [category, setCategory] = useState<TicketCategory | typeof CATEGORY_FILTER_ALL>(
    CATEGORY_FILTER_ALL
  );

  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard-tickets-by-assignee", range, category],
    queryFn: () => fetchTicketsByAssignee(range, category),
  });

  const slices = toSlices(data?.ticketsByAssignee ?? []);
  const hasData = slices.length > 0;

  const chartConfig: ChartConfig = Object.fromEntries(
    slices.map((s) => [
      s.key,
      {
        label: s.name,
        color: s.key === OTHER_KEY ? "var(--categorical-other)" : `var(--categorical-${colorSlotFor(s.key)})`,
      },
    ])
  );

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Tickets by Assignee</CardTitle>
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
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie data={slices} dataKey="count" nameKey="key" innerRadius={50}>
                {slices.map((entry) => (
                  <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
