import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardFilters } from "@/lib/api";
import { cn, formatUsd, formatCompact, shortenAddress } from "@/lib/utils";
import {
  Loader2,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";

const TIMEFRAMES = ["24h", "7d", "30d", "all"] as const;

const RELATIVE_RANGES = [
  { label: "12h", seconds: 12 * 3600 },
  { label: "3d", seconds: 3 * 86400 },
  { label: "1w", seconds: 7 * 86400 },
  { label: "1m", seconds: 30 * 86400 },
] as const;

const SORTABLE_COLUMNS = [
  { key: "volume", label: "volume", align: "right" as const },
  { key: "trade_count", label: "trades", align: "right" as const },
  { key: "pnl", label: "pnl", align: "right" as const },
  { key: "win_rate", label: "win rate", align: "right" as const },
] as const;

type SortDir = "asc" | "desc" | null;

const PAGE_SIZE = 50;

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [sortBy, setSortBy] = useState("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [minTrades, setMinTrades] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [minWinRate, setMinWinRate] = useState("");
  const [pnlPositive, setPnlPositive] = useState(false);
  const [labelFilter, setLabelFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  // Date range — either relative preset or custom from/to
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [relativeRange, setRelativeRange] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Build filters object (only include defined values)
  const filters: LeaderboardFilters = {};
  if (minTrades) filters.min_trades = Number(minTrades);
  if (minVolume) filters.min_volume = Number(minVolume);
  if (minWinRate) filters.min_win_rate = Number(minWinRate) / 100;
  if (pnlPositive) filters.pnl_positive = true;
  if (labelFilter.trim()) filters.label = labelFilter.trim();
  if (marketFilter.trim()) filters.market = marketFilter.trim();
  if (eventFilter.trim()) filters.event_id = eventFilter.trim();

  if (dateMode === "preset" && relativeRange != null) {
    filters.from_ts = Math.floor(Date.now() / 1000) - relativeRange;
  } else if (dateMode === "custom") {
    if (fromDate)
      filters.from_ts = Math.floor(new Date(fromDate).getTime() / 1000);
    if (toDate) filters.to_ts = Math.floor(new Date(toDate).getTime() / 1000);
  }

  const hasActiveFilters = Object.keys(filters).length > 0;

  // Resolve effective sort params — null dir falls back to default (desc)
  const effectiveSortDir = sortDir ?? "desc";

  const { data, isLoading } = useLeaderboard(
    sortBy,
    effectiveSortDir,
    timeframe,
    PAGE_SIZE,
    page * PAGE_SIZE,
    "mentions",
    hasActiveFilters ? filters : undefined,
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      navigate(`/wallet/${trimmed}`);
    }
  };

  const handleColumnSort = (col: string) => {
    if (sortBy !== col) {
      // Clicking a new column → default desc
      setSortBy(col);
      setSortDir("desc");
    } else {
      // Cycling on same column: desc → asc → default (desc)
      if (sortDir === "desc") setSortDir("asc");
      else if (sortDir === "asc") setSortDir(null);
      else setSortDir("desc");
    }
    setPage(0);
  };

  const clearFilters = () => {
    setMinTrades("");
    setMinVolume("");
    setMinWinRate("");
    setPnlPositive(false);
    setLabelFilter("");
    setMarketFilter("");
    setEventFilter("");
    setDateMode("preset");
    setRelativeRange(null);
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col || sortDir === null)
      return <ChevronsUpDown className="h-3 w-3 text-gray-600" />;
    if (sortDir === "desc")
      return <ChevronDown className="h-3 w-3 text-brand-400" />;
    return <ChevronUp className="h-3 w-3 text-brand-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Trophy className="h-6 w-6 text-brand-500" />
            leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            top traders on mentions markets
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="search wallet (0x...)"
              className="input pl-9"
              style={{ maxWidth: "280px" }}
            />
          </div>
        </form>
      </div>

      {/* Timeframe + Filter toggle */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Timeframe */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-dark-2 p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setPage(0);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  timeframe === tf
                    ? "bg-brand-700 text-white"
                    : "text-gray-400 hover:text-white",
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              showFilters || hasActiveFilters
                ? "bg-brand-700 text-white"
                : "text-gray-400 hover:text-white",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            filters
            {hasActiveFilters && (
              <span className="badge ml-1">{Object.keys(filters).length}</span>
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="mt-4 border-t border-surface-dark-3 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Min trades */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  min trades
                </label>
                <input
                  type="number"
                  min={1}
                  value={minTrades}
                  onChange={(e) => {
                    setMinTrades(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. 5"
                  className="input w-full"
                />
              </div>

              {/* Min volume */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  min volume (usd)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minVolume}
                  onChange={(e) => {
                    setMinVolume(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. 100"
                  className="input w-full"
                />
              </div>

              {/* Min win rate */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  min win rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minWinRate}
                  onChange={(e) => {
                    setMinWinRate(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. 50"
                  className="input w-full"
                />
              </div>

              {/* Profitable only */}
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={pnlPositive}
                    onChange={(e) => {
                      setPnlPositive(e.target.checked);
                      setPage(0);
                    }}
                    className="h-4 w-4 rounded border-surface-dark-3 bg-surface-dark-2 text-brand-500"
                  />
                  profitable only
                </label>
              </div>

              {/* Label */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  wallet label
                </label>
                <input
                  type="text"
                  value={labelFilter}
                  onChange={(e) => {
                    setLabelFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="e.g. whale"
                  className="input w-full"
                />
              </div>

              {/* Market */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  market (condition id)
                </label>
                <input
                  type="text"
                  value={marketFilter}
                  onChange={(e) => {
                    setMarketFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="condition_id"
                  className="input w-full"
                />
              </div>

              {/* Event */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  event id
                </label>
                <input
                  type="text"
                  value={eventFilter}
                  onChange={(e) => {
                    setEventFilter(e.target.value);
                    setPage(0);
                  }}
                  placeholder="event_id"
                  className="input w-full"
                />
              </div>

              {/* Date range — combined component */}
              <div className="sm:col-span-2">
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  date range
                </label>

                {/* Mode toggle */}
                <div className="mb-2 flex items-center gap-1 rounded-lg bg-surface-dark-2 p-0.5 w-fit">
                  <button
                    onClick={() => {
                      setDateMode("preset");
                      setFromDate("");
                      setToDate("");
                      setPage(0);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      dateMode === "preset"
                        ? "bg-surface-dark-3 text-white"
                        : "text-gray-500 hover:text-white",
                    )}
                  >
                    relative
                  </button>
                  <button
                    onClick={() => {
                      setDateMode("custom");
                      setRelativeRange(null);
                      setPage(0);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      dateMode === "custom"
                        ? "bg-surface-dark-3 text-white"
                        : "text-gray-500 hover:text-white",
                    )}
                  >
                    custom
                  </button>
                </div>

                {dateMode === "preset" ? (
                  <div className="flex flex-wrap gap-1">
                    {RELATIVE_RANGES.map((r) => (
                      <button
                        key={r.label}
                        onClick={() => {
                          setRelativeRange(
                            relativeRange === r.seconds ? null : r.seconds,
                          );
                          setPage(0);
                        }}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs transition-colors",
                          relativeRange === r.seconds
                            ? "bg-brand-700 text-white"
                            : "bg-surface-dark-2 text-gray-400 hover:text-white",
                        )}
                      >
                        last {r.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="datetime-local"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(0);
                      }}
                      className="input min-w-0 text-xs"
                    />
                    <span className="text-xs text-gray-600">—</span>
                    <input
                      type="datetime-local"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(0);
                      }}
                      className="input min-w-0 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <button onClick={clearFilters} className="btn-ghost text-xs">
                  clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : !data?.wallets.length ? (
          <div className="flex items-center justify-center py-20 text-gray-600">
            <div className="text-center">
              <Trophy className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">
                no traders found yet — data is being collected
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-dark-3 text-left text-xs text-gray-500">
                    <th className="px-4 py-3">rank</th>
                    <th className="px-4 py-3">wallet</th>
                    {SORTABLE_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-right",
                          sortBy === col.key && sortDir !== null
                            ? "text-brand-400"
                            : "",
                        )}
                      >
                        <button
                          onClick={() => handleColumnSort(col.key)}
                          className="inline-flex items-center gap-1 transition-colors hover:text-white"
                        >
                          {col.label}
                          <SortIcon col={col.key} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.wallets.map((w, i) => (
                    <tr
                      key={w.address}
                      className="border-b border-surface-dark-3/50 transition-colors hover:bg-surface-dark-2/50"
                    >
                      <td className="px-4 py-3 font-mono text-gray-500">
                        #{page * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/wallet/${w.address}`}
                          className="font-mono text-brand-400 hover:text-brand-300"
                        >
                          {shortenAddress(w.address, 6)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {formatUsd(w.volume)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {formatCompact(w.trade_count)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono",
                          w.pnl >= 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {w.pnl >= 0 ? "+" : ""}
                        {formatUsd(w.pnl)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {(w.win_rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-surface-dark-3 px-4 py-3">
              <span className="text-xs text-gray-500">
                {data.total} traders
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-ghost p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400">
                  page {page + 1} of{" "}
                  {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= data.total}
                  className="btn-ghost p-1 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
