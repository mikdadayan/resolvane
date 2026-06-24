import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "@/pages/TicketsPage/constants";
import type { Ticket } from "@/pages/TicketsPage/types";

type TicketDetail = Ticket & {
  body: string;
  updatedAt: string;
};

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await axios.get<TicketDetail>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}`,
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
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to tickets
      </Link>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : ticket ? (
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-3">{ticket.subject}</h1>

          <div className="flex items-center gap-2 mb-6">
            <Badge>{ticket.status}</Badge>
            <Badge variant="outline">
              {ticket.category ? CATEGORY_LABELS[ticket.category] : "Uncategorized"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-y-3 mb-6 text-sm">
            <p>
              <span className="text-muted-foreground">From: </span>
              {ticket.senderName} ({ticket.senderEmail})
            </p>
            <p>
              <span className="text-muted-foreground">Assigned to: </span>
              {ticket.assignedTo?.name ?? "Unassigned"}
            </p>
            <p>
              <span className="text-muted-foreground">Created: </span>
              {new Date(ticket.receivedAt).toLocaleString()}
            </p>
            <p>
              <span className="text-muted-foreground">Updated: </span>
              {new Date(ticket.updatedAt).toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="font-medium text-foreground">Message</p>
            <p className="text-sm text-muted-foreground mb-3">From {ticket.senderName}</p>
            <p className="whitespace-pre-wrap text-foreground">{ticket.body}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
