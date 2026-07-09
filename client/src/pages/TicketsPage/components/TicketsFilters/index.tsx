import { useEffect, useState } from "react";
import { TicketStatus, TicketCategory, VISIBLE_TICKET_STATUSES } from "@helpdesk/core";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, CATEGORY_LABELS } from "../../constants";

export const STATUS_FILTER_ALL = "all";
export const CATEGORY_FILTER_ALL = "all";

interface Props {
  search: string;
  status: TicketStatus | typeof STATUS_FILTER_ALL;
  category: TicketCategory | typeof CATEGORY_FILTER_ALL;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export default function TicketsFilters({
  search,
  status,
  category,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: Props) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="flex items-center gap-3 mb-4">
      <Input
        placeholder="Search tickets..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="max-w-xs"
        aria-label="Search tickets"
      />

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger aria-label="Filter by status" className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATUS_FILTER_ALL}>All Statuses</SelectItem>
          {VISIBLE_TICKET_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger aria-label="Filter by category" className="w-48">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CATEGORY_FILTER_ALL}>All Categories</SelectItem>
          {Object.values(TicketCategory).map((value) => (
            <SelectItem key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
