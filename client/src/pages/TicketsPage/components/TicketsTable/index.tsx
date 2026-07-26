import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TicketSortBy } from "@helpdesk/core";
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
import type { Ticket } from "@helpdesk/core";

const columns: ColumnDef<Ticket>[] = [
  {
    id: TicketSortBy.subject,
    header: "Subject",
    accessorKey: "subject",
    cell: ({ row }) => (
      <Link to={`/tickets/${row.original.id}`} className="font-medium">
        {row.original.subject}
      </Link>
    ),
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
  );
}
