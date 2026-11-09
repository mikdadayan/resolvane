import { runtimeConfig } from "@/lib/runtime-config";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { TicketStatus, TicketCategory, TicketSortBy, TICKETS_PAGE_SIZE } from "@resolvane/core";
import TicketsTable from "./components/TicketsTable";
import TicketsFilters, {
  STATUS_FILTER_ALL,
  CATEGORY_FILTER_ALL,
} from "./components/TicketsFilters";
import TicketsPagination from "./components/TicketsPagination";
import type { Ticket } from "@resolvane/core";

type ListTicketsParams = {
  sortBy: TicketSortBy;
  sortOrder: "asc" | "desc";
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  page: number;
};

type ListTicketsResponse = {
  tickets: Ticket[];
  total: number;
};

async function fetchTickets(params: ListTicketsParams): Promise<ListTicketsResponse> {
  const res = await axios.get<ListTicketsResponse>(`${runtimeConfig.apiBaseUrl}/api/tickets`, {
    params,
    withCredentials: true,
  });
  return res.data;
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
  const page = Number(searchParams.get("page") ?? "1");
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data, isPending, error } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder, search, status, category, page],
    queryFn: () =>
      fetchTickets({
        sortBy,
        sortOrder,
        search: search || undefined,
        status: status === STATUS_FILTER_ALL ? undefined : status,
        category: category === CATEGORY_FILTER_ALL ? undefined : category,
        page,
      }),
  });

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / TICKETS_PAGE_SIZE));

  const resetPage = (params: URLSearchParams) => {
    params.delete("page");
    return params;
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const nextSort = next[0];
    if (!nextSort) return;
    setSearchParams((prev) => {
      const params = resetPage(new URLSearchParams(prev));
      params.set("sortBy", nextSort.id);
      params.set("sortOrder", nextSort.desc ? "desc" : "asc");
      return params;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchParams((prev) => {
      const params = resetPage(new URLSearchParams(prev));
      if (value) params.set("search", value);
      else params.delete("search");
      return params;
    });
  };

  const handleStatusChange = (value: string) => {
    setSearchParams((prev) => {
      const params = resetPage(new URLSearchParams(prev));
      if (value === STATUS_FILTER_ALL) params.delete("status");
      else params.set("status", value);
      return params;
    });
  };

  const handleCategoryChange = (value: string) => {
    setSearchParams((prev) => {
      const params = resetPage(new URLSearchParams(prev));
      if (value === CATEGORY_FILTER_ALL) params.delete("category");
      else params.set("category", value);
      return params;
    });
  };

  const handlePageChange = (nextPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextPage <= 1) params.delete("page");
      else params.set("page", String(nextPage));
      return params;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Support workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tickets</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review requests, follow conversations, and keep support moving.</p>
        </div>
        {data && <span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium tabular-nums text-foreground">{data.total} matching tickets</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

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
        tickets={data?.tickets}
        isPending={isPending}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />

      <div className="border-t border-border px-4 pb-4">
        <TicketsPagination page={page} pageCount={pageCount} onPageChange={handlePageChange} />
      </div>
      </div>
    </div>
  );
}
