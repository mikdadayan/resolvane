import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronsUpDown, Copy } from "lucide-react";
import { TicketSortBy } from "@resolvane/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "../../constants";
import StatusBadge from "../StatusBadge";
import type { Ticket } from "@resolvane/core";

const columns: ColumnDef<Ticket>[] = [
  {
    id: TicketSortBy.subject,
    header: "Subject",
    accessorKey: "subject",
    cell: ({ row }) => (
      <Link to={`/tickets/${row.original.id}`} className="block min-w-48 max-w-sm whitespace-normal font-semibold leading-6 text-foreground decoration-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        {row.original.subject}
      </Link>
    ),
  },
  {
    id: TicketSortBy.senderName,
    header: "From",
    accessorFn: (ticket) => `${ticket.senderName} (${ticket.senderEmail})`,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">{row.original.senderName}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {row.original.senderEmail}
          <button
            type="button"
            aria-label={`Copy ${row.original.senderEmail}`}
            title="Copy email address"
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(row.original.senderEmail);
                toast.success("Email address copied");
              } catch {
                toast.error("Could not copy email address. Please copy it manually.");
              }
            }}
          >
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    ),
  },
  {
    id: TicketSortBy.status,
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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

interface Props {
  tickets: Ticket[] | undefined;
  isPending: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export default function TicketsTable({ tickets, isPending, sorting, onSortingChange }: Props) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table className="text-sm">
      <TableHeader className="bg-muted/70">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className="h-12 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <button
                  type="button"
                  disabled={!header.column.getCanSort()}
                  onClick={header.column.getToggleSortingHandler()}
                  className="inline-flex items-center gap-2 rounded-sm text-inherit uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() &&
                    (header.column.getIsSorted() === "asc" ? (
                      <ChevronUp className="size-3.5" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                    ))}
                </button>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {!isPending && tickets?.length === 0 && (
          <TableRow><TableCell colSpan={6} className="h-40 text-center">
            <p className="font-medium text-foreground">No tickets to show</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or adjust your filters.</p>
          </TableCell></TableRow>
        )}
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
              <TableRow key={row.id} className="transition-colors hover:bg-accent/50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
