import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export default function TicketsPagination({ page, pageCount, onPageChange }: Props) {
  const isFirstPage = page <= 1;
  const isLastPage = page >= pageCount;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isFirstPage}
        onClick={() => onPageChange(1)}
        aria-label="First page"
      >
        <ChevronsLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isFirstPage}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isLastPage}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isLastPage}
        onClick={() => onPageChange(pageCount)}
        aria-label="Last page"
      >
        <ChevronsRight />
      </Button>
    </div>
  );
}
