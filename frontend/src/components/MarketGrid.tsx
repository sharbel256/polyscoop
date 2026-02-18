import { useState } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "./MarketCard";
import { Loader2, AlertCircle, Search, SlidersHorizontal } from "lucide-react";

const SORT_OPTIONS = [
  { label: "volume", value: "volume" },
  { label: "liquidity", value: "liquidity" },
  { label: "newest", value: "end_date" },
];

export function MarketGrid() {
  const [sortBy, setSortBy] = useState("volume");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error, isFetching } = useMarkets({
    limit,
    offset: page * limit,
    order: sortBy,
    active: true,
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">prediction markets</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            browse live markets on polymarket
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="search markets..."
              className="input pl-9"
              style={{ maxWidth: "240px" }}
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-1">
            <SlidersHorizontal className="mx-2 h-4 w-4 text-gray-500" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSortBy(opt.value);
                  setPage(0);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? "bg-brand-700 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card flex items-center gap-3 border-red-900/50 bg-red-950/30 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">failed to load markets</p>
            <p className="mt-0.5 text-sm text-red-400/70">
              {error instanceof Error ? error.message : "unknown error"}
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.markets.map((market) => (
              <MarketCard key={market.condition_id} market={market} />
            ))}
          </div>

          {data.markets.length === 0 && !isLoading && (
            <div className="py-20 text-center text-gray-500">
              no markets found
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary"
            >
              previous
            </button>
            <span className="text-sm text-gray-500">
              page {page + 1}
              {isFetching && (
                <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
              )}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next_cursor}
              className="btn-secondary"
            >
              next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
