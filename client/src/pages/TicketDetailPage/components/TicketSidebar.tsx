import { runtimeConfig } from "@/lib/runtime-config";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TicketStatus, TicketCategory, AGENT_SETTABLE_TICKET_STATUSES } from "@resolvane/core";
import { SelectItem } from "@/components/ui/select";
import { STATUS_LABELS, CATEGORY_LABELS } from "@/pages/TicketsPage/constants";
import SelectField from "@/components/SelectField";
import type { AssignableUser, TicketDetail } from "../types";

const UNASSIGNED = "unassigned";
const UNCATEGORIZED = "uncategorized";

type UpdateTicketInput = { status?: TicketStatus; category?: TicketCategory };

async function fetchUsers(): Promise<AssignableUser[]> {
  const res = await axios.get(`${runtimeConfig.apiBaseUrl}/api/users`, {
    withCredentials: true,
  });
  return res.data.users;
}

async function assignTicket(id: string, assignedToId: string | null): Promise<TicketDetail> {
  const res = await axios.patch<TicketDetail>(
    `${runtimeConfig.apiBaseUrl}/api/tickets/${id}/assign`,
    { assignedToId },
    { withCredentials: true }
  );
  return res.data;
}

async function updateTicket(id: string, data: UpdateTicketInput): Promise<TicketDetail> {
  const res = await axios.patch<TicketDetail>(
    `${runtimeConfig.apiBaseUrl}/api/tickets/${id}`,
    data,
    { withCredentials: true }
  );
  return res.data;
}

type Props = {
  ticket: TicketDetail;
  id: string;
};

export default function TicketSidebar({ ticket, id }: Props) {
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) => assignTicket(id, assignedToId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ticket", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTicketInput) => updateTicket(id, data),
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

  const handleAssigneeChange = (value: string) => {
    assignMutation.mutate(value === UNASSIGNED ? null : value);
  };

  return (
    <div className="space-y-4">
      <SelectField
        label="Status"
        ariaLabel="Update status"
        value={ticket.status}
        displayValue={STATUS_LABELS[ticket.status]}
        onValueChange={handleStatusChange}
        disabled={updateMutation.isPending}
      >
        {AGENT_SETTABLE_TICKET_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectField>

      <SelectField
        label="Category"
        ariaLabel="Update category"
        value={ticket.category ?? UNCATEGORIZED}
        displayValue={ticket.category ? CATEGORY_LABELS[ticket.category] : "Uncategorized"}
        onValueChange={handleCategoryChange}
        disabled={updateMutation.isPending}
      >
        <SelectItem value={UNCATEGORIZED} disabled>
          Uncategorized
        </SelectItem>
        {Object.values(TicketCategory).map((value) => (
          <SelectItem key={value} value={value}>
            {CATEGORY_LABELS[value]}
          </SelectItem>
        ))}
      </SelectField>

      <SelectField
        label="Assigned to"
        ariaLabel="Assign ticket"
        value={ticket.assignedTo?.id ?? UNASSIGNED}
        displayValue={ticket.assignedTo?.name ?? "Unassigned"}
        onValueChange={handleAssigneeChange}
        disabled={assignMutation.isPending}
      >
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectField>
    </div>
  );
}
