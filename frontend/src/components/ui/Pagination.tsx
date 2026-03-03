import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
      <span className="text-xs text-foreground-muted">{total} total</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="btn-ghost rounded-lg p-1.5 transition-colors hover:bg-surface-hover disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const pageNum =
            totalPages <= 5
              ? i
              : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                page === pageNum
                  ? "bg-brand-500/20 text-brand-400"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {pageNum + 1}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={(page + 1) * pageSize >= total}
          className="btn-ghost rounded-lg p-1.5 transition-colors hover:bg-surface-hover disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
