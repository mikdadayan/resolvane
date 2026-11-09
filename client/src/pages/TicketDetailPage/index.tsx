import { runtimeConfig } from "@/lib/runtime-config";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import BackLink from "@/components/BackLink";
import TicketDetail from "./components/TicketDetail";
import TicketSidebar from "./components/TicketSidebar";
import type { TicketDetail as TicketDetailType } from "./types";

async function fetchTicket(id: string): Promise<TicketDetailType> {
  const res = await axios.get<TicketDetailType>(
    `${runtimeConfig.apiBaseUrl}/api/tickets/${id}`,
    { withCredentials: true }
  );
  return res.data;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <BackLink to="/tickets" label="Back to tickets" />

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : ticket ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <TicketDetail ticket={ticket} id={id!} />
          <TicketSidebar ticket={ticket} id={id!} />
        </div>
      ) : null}
    </div>
  );
}
