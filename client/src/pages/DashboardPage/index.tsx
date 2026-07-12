import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@helpdesk/core";
import StatCard from "./components/StatCard";
import TicketsPerDayChart from "./components/TicketsPerDayChart";
import TicketsByStatusChart from "./components/TicketsByStatusChart";
import TicketsByAssigneeChart from "./components/TicketsByAssigneeChart";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await axios.get<DashboardStats>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/dashboard/stats`,
    { withCredentials: true }
  );
  return res.data;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

export default function DashboardPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h1>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Tickets" value={data?.totalTickets ?? 0} isPending={isPending} />
        <StatCard label="Open Tickets" value={data?.openTickets ?? 0} isPending={isPending} />
        <StatCard label="Resolved by AI" value={data?.aiResolvedTickets ?? 0} isPending={isPending} />
        <StatCard
          label="% Resolved by AI"
          value={data ? `${data.aiResolvedPercentage.toFixed(1)}%` : "0%"}
          isPending={isPending}
        />
        <StatCard
          label="Avg. Resolution Time"
          value={data ? formatDuration(data.avgResolutionTimeMs) : "—"}
          isPending={isPending}
        />
      </div>

      <TicketsPerDayChart data={data?.ticketsPerDay} isPending={isPending} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TicketsByStatusChart />
        <TicketsByAssigneeChart />
      </div>
    </div>
  );
}
