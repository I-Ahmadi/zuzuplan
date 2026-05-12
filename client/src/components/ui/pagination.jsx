import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 20;

export function getClientPagination(items = [], page = 1, limit = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  };
}

export function PaginationControls({ pagination, onPageChange, className }) {
  if (!pagination) return null;

  const start = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);
  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <div className={cn("flex flex-col gap-2 rounded-md border bg-background px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>-<span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{pagination.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded px-2.5 text-sm"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-xs text-muted-foreground">
          Page {pagination.page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded px-2.5 text-sm"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
