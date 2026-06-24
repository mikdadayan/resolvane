import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { TicketStatus, TicketCategory, TicketSortBy } from "@helpdesk/core";
import TicketsTable from "./components/TicketsTable";
import TicketsFilters, {
  STATUS_FILTER_ALL,
  CATEGORY_FILTER_ALL,
} from "./components/TicketsFilters";
import type { Ticket } from "./types";

type ListTicketsParams = {
  sortBy: TicketSortBy;
  sortOrder: "asc" | "desc";
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
};

async function fetchTickets(params: ListTicketsParams): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>(`${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets`, {
    params,
    withCredentials: true,
  });
  return res.data.tickets;
}

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = (searchParams.get("sortBy") ?? TicketSortBy.receivedAt) as TicketSortBy;
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? STATUS_FILTER_ALL) as TicketStatus | typeof STATUS_FILTER_ALL;
  const category = (searchParams.get("category") ?? CATEGORY_FILTER_ALL) as
    | TicketCategory
    | typeof CATEGORY_FILTER_ALL;
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data: tickets, isPending, error } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder, search, status, category],
    queryFn: () =>
      fetchTickets({
        sortBy,
        sortOrder,
        search: search || undefined,
        status: status === STATUS_FILTER_ALL ? undefined : status,
        category: category === CATEGORY_FILTER_ALL ? undefined : category,
      }),
  });

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const nextSort = next[0];
    if (!nextSort) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("sortBy", nextSort.id);
      params.set("sortOrder", nextSort.desc ? "desc" : "asc");
      return params;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set("search", value);
      else params.delete("search");
      return params;
    });
  };

  const handleStatusChange = (value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value === STATUS_FILTER_ALL) params.delete("status");
      else params.set("status", value);
      return params;
    });
  };

  const handleCategoryChange = (value: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value === CATEGORY_FILTER_ALL) params.delete("category");
      else params.set("category", value);
      return params;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Tickets</h1>

      <TicketsFilters
        search={search}
        status={status}
        category={category}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onCategoryChange={handleCategoryChange}
      />

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <TicketsTable
        tickets={tickets}
        isPending={isPending}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />
    </div>
  );
}
