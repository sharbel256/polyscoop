import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardFilters } from "@/lib/api";
import { cn, formatUsd, formatCompact, shortenAddress } from "@/lib/utils";
import { WalletAvatar } from "@/components/WalletAvatar";
import { Card, Spinner, EmptyState, Pagination } from "@/components/ui";
import { staggerContainer, tableRowVariant, slideUp } from "@/lib/motion";
import {
  Trophy,
  Search,
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
  { key: "volume", label: "volume", align: "right" as const, visibility: "" },
  {
    key: "trade_count",
    label: "trades",
    align: "right" as const,
    visibility: "hidden md:table-cell",
  },
  {
    key: "pnl",
    label: "pnl",
    align: "right" as const,
    visibility: "hidden sm:table-cell",
  },
  {
    key: "win_rate",
    label: "win rate",
    align: "right" as const,
    visibility: "hidden lg:table-cell",
  },
  { key: "roi", label: "roi", align: "right" as const, visibility: "" },
  {
    key: "consistency",
    label: "consistency",
    align: "right" as const,
    visibility: "hidden lg:table-cell",
  },
] as const;

type SortDir = "asc" | "desc" | null;

const PAGE_SIZE = 50;

function RankBadge({ rank }: { rank: number }) {
  const gradients: Record<number, string> = {
    1: "from-accent-cyan to-brand-500",
    2: "from-brand-500 to-accent-purple",
    3: "from-accent-purple to-accent-pink",
  };
  const gradient = gradients[rank];
  if (!gradient) {
    return <span className="font-mono text-foreground-muted">#{rank}</span>;
  }
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r ${gradient} text-xs font-bold text-white`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [sortBy, setSortBy] = useState("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [minTrades, setMinTrades] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [minWinRate, setMinWinRate] = useState("");
  const [pnlPositive, setPnlPositive] = useState(false);
  const [labelFilter, setLabelFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [maxBotScore, setMaxBotScore] = useState("");
  const [minRoi, setMinRoi] = useState("");
  const [minConsistency, setMinConsistency] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [relativeRange, setRelativeRange] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters: LeaderboardFilters = {};
  if (minTrades) filters.min_trades = Number(minTrades);
  if (minVolume) filters.min_volume = Number(minVolume);
  if (minWinRate) filters.min_win_rate = Number(minWinRate) / 100;
  if (pnlPositive) filters.pnl_positive = true;
  if (labelFilter.trim()) filters.label = labelFilter.trim();
  if (marketFilter.trim()) filters.market = marketFilter.trim();
  if (eventFilter.trim()) filters.event_id = eventFilter.trim();
  if (maxBotScore) filters.max_bot_score = Number(maxBotScore);
  if (minRoi) filters.min_roi = Number(minRoi);
  if (minConsistency) filters.min_consistency = Number(minConsistency);
  if (primaryCategory.trim()) filters.primary_category = primaryCategory.trim();
  if (dateMode === "preset" && relativeRange != null) {
    filters.from_ts = Math.floor(Date.now() / 1000) - relativeRange;
  } else if (dateMode === "custom") {
    if (fromDate)
      filters.from_ts = Math.floor(new Date(fromDate).getTime() / 1000);
    if (toDate) filters.to_ts = Math.floor(new Date(toDate).getTime() / 1000);
  }

  const hasActiveFilters = Object.keys(filters).length > 0;
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
      setSortBy(col);
      setSortDir("desc");
    } else {
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
    setMaxBotScore("");
    setMinRoi("");
    setMinConsistency("");
    setPrimaryCategory("");
    setDateMode("preset");
    setRelativeRange(null);
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col || sortDir === null)
      return <ChevronsUpDown className="h-3 w-3 text-foreground-muted" />;
    if (sortDir === "desc")
      return <ChevronDown className="h-3 w-3 text-brand-400" />;
    return <ChevronUp className="h-3 w-3 text-brand-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-h2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
              <Trophy className="h-5 w-5 text-brand-400" />
            </div>
            leaderboard
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            top traders on mentions markets
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="search wallet (0x...)"
              className="input w-full pl-9 sm:max-w-[280px]"
            />
          </div>
        </form>
      </motion.div>

      {/* Timeframe + Filter toggle */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="glass-subtle flex items-center gap-1 rounded-lg p-1">
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
                    ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white"
                    : "text-foreground-secondary hover:text-foreground",
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              showFilters || hasActiveFilters
                ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white"
                : "text-foreground-secondary hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            filters
            {hasActiveFilters && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "min trades",
                      value: minTrades,
                      set: setMinTrades,
                      type: "number",
                      placeholder: "e.g. 5",
                      min: 1,
                    },
                    {
                      label: "min volume (usd)",
                      value: minVolume,
                      set: setMinVolume,
                      type: "number",
                      placeholder: "e.g. 100",
                      min: 0,
                    },
                    {
                      label: "min win rate (%)",
                      value: minWinRate,
                      set: setMinWinRate,
                      type: "number",
                      placeholder: "e.g. 50",
                      min: 0,
                      max: 100,
                    },
                  ].map(({ label, value, set, ...inputProps }) => (
                    <div key={label}>
                      <label className="mb-1 block text-xs text-foreground-muted">
                        {label}
                      </label>
                      <input
                        {...inputProps}
                        value={value}
                        onChange={(e) => {
                          set(e.target.value);
                          setPage(0);
                        }}
                        className="input w-full"
                      />
                    </div>
                  ))}

                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground-secondary">
                      <input
                        type="checkbox"
                        checked={pnlPositive}
                        onChange={(e) => {
                          setPnlPositive(e.target.checked);
                          setPage(0);
                        }}
                        className="h-4 w-4 rounded border-border bg-surface-elevated text-brand-500"
                      />
                      profitable only
                    </label>
                  </div>

                  {[
                    {
                      label: "max bot score (0-1)",
                      value: maxBotScore,
                      set: setMaxBotScore,
                      step: 0.1,
                    },
                    {
                      label: "min roi",
                      value: minRoi,
                      set: setMinRoi,
                      step: 0.01,
                    },
                    {
                      label: "min consistency",
                      value: minConsistency,
                      set: setMinConsistency,
                      step: 0.1,
                    },
                  ].map(({ label, value, set, step }) => (
                    <div key={label}>
                      <label className="mb-1 block text-xs text-foreground-muted">
                        {label}
                      </label>
                      <input
                        type="number"
                        step={step}
                        value={value}
                        onChange={(e) => {
                          set(e.target.value);
                          setPage(0);
                        }}
                        className="input w-full"
                      />
                    </div>
                  ))}

                  {[
                    {
                      label: "primary category",
                      value: primaryCategory,
                      set: setPrimaryCategory,
                      placeholder: "e.g. mentions",
                    },
                    {
                      label: "wallet label",
                      value: labelFilter,
                      set: setLabelFilter,
                      placeholder: "e.g. whale",
                    },
                    {
                      label: "market (condition id)",
                      value: marketFilter,
                      set: setMarketFilter,
                      placeholder: "condition_id",
                    },
                    {
                      label: "event id",
                      value: eventFilter,
                      set: setEventFilter,
                      placeholder: "event_id",
                    },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="mb-1 block text-xs text-foreground-muted">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          set(e.target.value);
                          setPage(0);
                        }}
                        placeholder={placeholder}
                        className="input w-full"
                      />
                    </div>
                  ))}

                  {/* Date range */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-foreground-muted">
                      <Calendar className="h-3 w-3" />
                      date range
                    </label>
                    <div className="mb-2 glass-subtle flex w-fit items-center gap-1 rounded-lg p-0.5">
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
                            ? "bg-surface-hover text-foreground"
                            : "text-foreground-muted hover:text-foreground",
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
                            ? "bg-surface-hover text-foreground"
                            : "text-foreground-muted hover:text-foreground",
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
                                ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white"
                                : "bg-surface-elevated/40 text-foreground-secondary hover:text-foreground",
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
                        <span className="text-xs text-foreground-muted">—</span>
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
                    <button
                      onClick={clearFilters}
                      className="btn-ghost text-xs"
                    >
                      clear filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Table */}
      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : !data?.wallets.length ? (
          <EmptyState
            icon={Trophy}
            title="no traders found yet — data is being collected"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-foreground-muted">
                    <th className="hidden px-2 py-3 sm:table-cell sm:px-4">
                      rank
                    </th>
                    <th className="px-2 py-3 sm:px-4">wallet</th>
                    {SORTABLE_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-2 py-3 text-right sm:px-4",
                          col.visibility,
                          sortBy === col.key && sortDir !== null
                            ? "text-brand-400"
                            : "",
                        )}
                      >
                        <button
                          onClick={() => handleColumnSort(col.key)}
                          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                        >
                          {col.label}
                          <SortIcon col={col.key} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {data.wallets.map((w, i) => (
                    <motion.tr
                      key={w.address}
                      variants={tableRowVariant}
                      className="border-b border-white/[0.03] transition-colors hover:bg-surface-elevated/30 hover:border-l-2 hover:border-l-brand-500/50"
                    >
                      <td className="hidden px-2 py-3 sm:table-cell sm:px-4">
                        <RankBadge rank={page * PAGE_SIZE + i + 1} />
                      </td>
                      <td className="px-2 py-3 sm:px-4">
                        <Link
                          to={`/wallet/${w.address}`}
                          className="flex items-center gap-2 hover:opacity-80"
                        >
                          <WalletAvatar
                            address={w.address}
                            imageUrl={w.profile_image_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p
                              className={
                                w.display_name
                                  ? "truncate text-sm text-foreground-secondary"
                                  : "font-mono text-sm text-brand-400"
                              }
                            >
                              {w.display_name
                                ? w.display_name.toLowerCase()
                                : shortenAddress(w.address, 6)}
                            </p>
                            {w.display_name && (
                              <p className="font-mono text-xs text-foreground-muted">
                                {shortenAddress(w.address, 4)}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-foreground-secondary sm:px-4">
                        {formatUsd(w.volume)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-foreground-secondary md:table-cell">
                        {formatCompact(w.trade_count)}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-3 text-right font-mono sm:table-cell",
                          w.pnl >= 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {w.pnl >= 0 ? "+" : ""}
                        {formatUsd(w.pnl)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-foreground-secondary lg:table-cell">
                        {(w.win_rate * 100).toFixed(1)}%
                      </td>
                      <td
                        className={cn(
                          "px-2 py-3 text-right font-mono sm:px-4",
                          w.roi >= 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {w.roi >= 0 ? "+" : ""}
                        {(w.roi * 100).toFixed(1)}%
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-foreground-secondary lg:table-cell">
                        {w.consistency.toFixed(2)}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
