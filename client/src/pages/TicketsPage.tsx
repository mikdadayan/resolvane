import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "@helpdesk/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Ticket = {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  receivedAt: string;
  assignedTo: { id: string; name: string } | null;
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.generalQuestion]: "General Question",
  [TicketCategory.technicalQuestion]: "Technical Question",
  [TicketCategory.refundRequest]: "Refund Request",
};

async function fetchTickets(): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>(`${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets`, {
    withCredentials: true,
  });
  return res.data.tickets;
}

export default function TicketsPage() {
  const { data: tickets, isPending, error } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Tickets</h1>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            : tickets?.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.senderName} ({ticket.senderEmail})
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        ticket.status === TicketStatus.open
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.category ? CATEGORY_LABELS[ticket.category] : "Uncategorized"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.assignedTo?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(ticket.receivedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
