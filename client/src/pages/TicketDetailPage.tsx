import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TicketStatus, TicketCategory } from "@helpdesk/core";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, CATEGORY_LABELS } from "@/pages/TicketsPage/constants";
import type { Ticket } from "@/pages/TicketsPage/types";

type TicketDetail = Ticket & {
  body: string;
  updatedAt: string;
};

type AssignableUser = { id: string; name: string };
type UpdateTicketInput = { status?: TicketStatus; category?: TicketCategory };

const UNASSIGNED = "unassigned";
const UNCATEGORIZED = "uncategorized";

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await axios.get<TicketDetail>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}`,
    { withCredentials: true }
  );
  return res.data;
}

async function fetchUsers(): Promise<AssignableUser[]> {
  const res = await axios.get(`${import.meta.env.VITE_SERVER_BASE_URL}/api/users`, {
    withCredentials: true,
  });
  return res.data.users;
}

async function assignTicket(id: string, assignedToId: string | null): Promise<TicketDetail> {
  const res = await axios.patch<TicketDetail>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}/assign`,
    { assignedToId },
    { withCredentials: true }
  );
  return res.data;
}

async function updateTicket(id: string, data: UpdateTicketInput): Promise<TicketDetail> {
  const res = await axios.patch<TicketDetail>(
    `${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets/${id}`,
    data,
    { withCredentials: true }
  );
  return res.data;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) => assignTicket(id!, assignedToId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const handleAssigneeChange = (value: string) => {
    assignMutation.mutate(value === UNASSIGNED ? null : value);
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTicketInput) => updateTicket(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const handleStatusChange = (value: string) => {
    updateMutation.mutate({ status: value as TicketStatus });
  };

  const handleCategoryChange = (value: string) => {
    if (value === UNCATEGORIZED) return;
    updateMutation.mutate({ category: value as TicketCategory });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-3 space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">{ticket.subject}</h1>

            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">From: </span>
                {ticket.senderName} ({ticket.senderEmail})
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

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Select
                value={ticket.status}
                onValueChange={handleStatusChange}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger aria-label="Update status" className="w-full">
                  <SelectValue>{() => STATUS_LABELS[ticket.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TicketStatus).map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Category</p>
              <Select
                value={ticket.category ?? UNCATEGORIZED}
                onValueChange={handleCategoryChange}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger aria-label="Update category" className="w-full">
                  <SelectValue>
                    {() => (ticket.category ? CATEGORY_LABELS[ticket.category] : "Uncategorized")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNCATEGORIZED} disabled>
                    Uncategorized
                  </SelectItem>
                  {Object.values(TicketCategory).map((value) => (
                    <SelectItem key={value} value={value}>
                      {CATEGORY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Assigned to</p>
              <Select
                value={ticket.assignedTo?.id ?? UNASSIGNED}
                onValueChange={handleAssigneeChange}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger aria-label="Assign ticket" className="w-full">
                  <SelectValue>{() => ticket.assignedTo?.name ?? "Unassigned"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
