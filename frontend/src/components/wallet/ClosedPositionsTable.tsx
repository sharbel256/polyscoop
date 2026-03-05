import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClosedPosition } from "@/lib/api";
import { cn, formatUsd } from "@/lib/utils";
import { Card, Spinner, EmptyState } from "@/components/ui";
import { staggerContainer, tableRowVariant } from "@/lib/motion";
import { MarketDetail } from "./MarketDetail";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";

type PnlFilter = "all" | "winners" | "losers";
type SortKey = "TIMESTAMP" | "REALIZEDPNL" | "AVGPRICE";
type SortDir = "ASC" | "DESC";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active || dir === null)
    return <ChevronsUpDown className="h-3 w-3 text-foreground-muted" />;
  if (dir === "DESC")
    return <ChevronDown className="h-3 w-3 text-brand-400" />;
  return <ChevronUp className="h-3 w-3 text-brand-400" />;
}

interface ClosedPositionsTableProps {
  positions: ClosedPosition[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  sortBy: SortKey;
  sortDir: SortDir;
  onSortChange: (key: SortKey, dir: SortDir) => void;
}

export function ClosedPositionsTable({
  positions,
  hasMore,
  isLoading,
  page,
  onPageChange,
  sortBy,
  sortDir,
  onSortChange,
}: ClosedPositionsTableProps) {
  const [pnlFilter, setPnlFilter] = useState<PnlFilter>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      onSortChange(key, sortDir === "DESC" ? "ASC" : "DESC");
    } else {
      onSortChange(key, "DESC");
    }
  };

  const filtered = positions
    ? pnlFilter === "all"
      ? positions
      : pnlFilter === "winners"
        ? positions.filter((p) => p.realizedPnl > 0)
        : positions.filter((p) => p.realizedPnl <= 0)
    : [];

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <h2 className="text-base font-bold text-foreground sm:text-lg">
          closed positions
        </h2>
        <div className="flex gap-1">
          {(["all", "winners", "losers"] as PnlFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPnlFilter(f)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                pnlFilter === f
                  ? "bg-brand-500/20 text-brand-400"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !positions?.length ? (
        <EmptyState icon={Archive} title="no closed positions" />
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-foreground-muted">
          <p className="text-sm">no {pnlFilter}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-foreground-muted">
                  <th className="px-2 py-2.5 sm:px-4">
                    <button
                      onClick={() => handleSort("TIMESTAMP")}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      date
                      <SortIcon
                        active={sortBy === "TIMESTAMP"}
                        dir={sortBy === "TIMESTAMP" ? sortDir : null}
                      />
                    </button>
                  </th>
                  <th className="px-2 py-2.5 sm:px-4">market</th>
                  <th className="hidden px-4 py-2.5 text-right md:table-cell">
                    <button
                      onClick={() => handleSort("AVGPRICE")}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      avg price
                      <SortIcon
                        active={sortBy === "AVGPRICE"}
                        dir={sortBy === "AVGPRICE" ? sortDir : null}
                      />
                    </button>
                  </th>
                  <th className="hidden px-4 py-2.5 text-right sm:table-cell">
                    invested
                  </th>
                  <th className="px-2 py-2.5 text-right sm:px-4">
                    <button
                      onClick={() => handleSort("REALIZEDPNL")}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      realized pnl
                      <SortIcon
                        active={sortBy === "REALIZEDPNL"}
                        dir={sortBy === "REALIZEDPNL" ? sortDir : null}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <motion.tbody
                key={pnlFilter}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {filtered.map((pos) => {
                  const isExpanded = expandedRow === pos.asset;
                  return (
                    <ClosedPositionRow
                      key={pos.asset}
                      pos={pos}
                      isExpanded={isExpanded}
                      onToggle={() =>
                        setExpandedRow(isExpanded ? null : pos.asset)
                      }
                    />
                  );
                })}
              </motion.tbody>
            </table>
          </div>

          <div className="flex items-center justify-end border-t border-white/[0.06] px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                prev
              </button>
              <span className="text-xs text-foreground-secondary">
                page {page + 1}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={!hasMore}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function ClosedPositionRow({
  pos,
  isExpanded,
  onToggle,
}: {
  pos: ClosedPosition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isPnlPositive = pos.realizedPnl > 0;
  const time = pos.timestamp
    ? new Date(pos.timestamp * 1000)
    : pos.endDate
      ? new Date(pos.endDate)
      : null;

  return (
    <>
      <motion.tr
        variants={tableRowVariant}
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-surface-elevated/30",
          isExpanded && "bg-surface-elevated/20 border-l-2 border-l-brand-500",
        )}
      >
        <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs text-foreground-muted sm:px-4">
          {time
            ? time.toLocaleDateString([], { month: "short", day: "numeric" })
            : "—"}
        </td>
        <td className="max-w-[200px] px-2 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            {pos.icon && (
              <img
                src={pos.icon}
                alt=""
                className="h-6 w-6 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-foreground-secondary">
                {pos.title || pos.conditionId.slice(0, 20) + "..."}
              </p>
              {pos.outcome && (
                <span
                  className={cn(
                    "text-xs",
                    pos.outcome === "Yes"
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}
                >
                  {pos.outcome.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-mono text-foreground-secondary md:table-cell">
          {(pos.avgPrice * 100).toFixed(1)}¢
        </td>
        <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-mono text-foreground-secondary sm:table-cell">
          {formatUsd(pos.totalBought)}
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-2 py-2.5 text-right font-mono sm:px-4",
            isPnlPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isPnlPositive ? "+" : ""}
          {formatUsd(pos.realizedPnl)}
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={5} className="p-0">
              <MarketDetail
                conditionId={pos.conditionId}
                tokenId={pos.asset}
                slug={pos.slug}
              />
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}
