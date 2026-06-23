import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TicketStatus, TicketCategory, TicketSortBy } from "@helpdesk/core";
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

async function fetchTickets(sortBy: string, sortOrder: string): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>(`${import.meta.env.VITE_SERVER_BASE_URL}/api/tickets`, {
    params: { sortBy, sortOrder },
    withCredentials: true,
  });
  return res.data.tickets;
}

const columns: ColumnDef<Ticket>[] = [
  {
    id: TicketSortBy.subject,
    header: "Subject",
    accessorKey: "subject",
    cell: ({ row }) => <span className="font-medium">{row.original.subject}</span>,
  },
  {
    id: TicketSortBy.senderName,
    header: "From",
    accessorFn: (ticket) => `${ticket.senderName} (${ticket.senderEmail})`,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.senderName} ({row.original.senderEmail})
      </span>
    ),
  },
  {
    id: TicketSortBy.status,
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          row.original.status === TicketStatus.open
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    id: TicketSortBy.category,
    header: "Category",
    accessorKey: "category",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.category ? CATEGORY_LABELS[row.original.category] : "Uncategorized"}
      </span>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.assignedTo?.name ?? "Unassigned"}</span>
    ),
  },
  {
    id: TicketSortBy.receivedAt,
    header: "Received",
    accessorKey: "receivedAt",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.receivedAt).toLocaleDateString()}
      </span>
    ),
  },
];

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = searchParams.get("sortBy") ?? TicketSortBy.receivedAt;
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data: tickets, isPending, error } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder],
    queryFn: () => fetchTickets(sortBy, sortOrder),
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

  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Tickets</h1>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() &&
                      (header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="size-3.5" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                      ))}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
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
            : table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
