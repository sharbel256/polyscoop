import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Position } from "@/lib/api";
import { cn, formatUsd } from "@/lib/utils";
import { Card, Spinner, EmptyState } from "@/components/ui";
import { staggerContainer, tableRowVariant } from "@/lib/motion";
import { MarketDetail } from "./MarketDetail";
import {
  Search,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";

type PositionSortKey = "size" | "currentValue" | "cashPnl";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active || dir === null)
    return <ChevronsUpDown className="h-3 w-3 text-foreground-muted" />;
  if (dir === "desc")
    return <ChevronDown className="h-3 w-3 text-brand-400" />;
  return <ChevronUp className="h-3 w-3 text-brand-400" />;
}

interface PositionsTableProps {
  positions: Position[] | undefined;
  isLoading: boolean;
}

export function PositionsTable({ positions, isLoading }: PositionsTableProps) {
  const [posSearch, setPosSearch] = useState("");
  const [posSortKey, setPosSortKey] = useState<PositionSortKey | null>(null);
  const [posSortDir, setPosSortDir] = useState<SortDir>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handlePositionSort = (key: PositionSortKey) => {
    if (posSortKey !== key) {
      setPosSortKey(key);
      setPosSortDir("desc");
    } else if (posSortDir === "desc") {
      setPosSortDir("asc");
    } else {
      setPosSortKey(null);
    }
  };

  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    let result = [...positions];
    if (posSearch.trim()) {
      const q = posSearch.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (posSortKey) {
      const dir = posSortDir === "asc" ? 1 : -1;
      result.sort((a, b) => (a[posSortKey] - b[posSortKey]) * dir);
    }
    return result;
  }, [positions, posSearch, posSortKey, posSortDir]);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-3 sm:px-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={posSearch}
            onChange={(e) => setPosSearch(e.target.value)}
            placeholder="filter by market title..."
            className="input w-full pl-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !positions || positions.length === 0 ? (
        <EmptyState icon={Briefcase} title="no active positions" />
      ) : filteredPositions.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-foreground-muted">
          <p className="text-sm">
            no positions match &quot;{posSearch}&quot;
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs text-foreground-muted">
                <th className="px-2 py-2.5 sm:px-4">market</th>
                <th className="hidden px-4 py-2.5 text-right sm:table-cell">
                  <button
                    onClick={() => handlePositionSort("size")}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    shares
                    <SortIcon
                      active={posSortKey === "size"}
                      dir={posSortKey === "size" ? posSortDir : null}
                    />
                  </button>
                </th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">
                  entry
                </th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">
                  current
                </th>
                <th className="px-2 py-2.5 text-right sm:px-4">
                  <button
                    onClick={() => handlePositionSort("currentValue")}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    value
                    <SortIcon
                      active={posSortKey === "currentValue"}
                      dir={posSortKey === "currentValue" ? posSortDir : null}
                    />
                  </button>
                </th>
                <th className="px-2 py-2.5 text-right sm:px-4">
                  <button
                    onClick={() => handlePositionSort("cashPnl")}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    p&l
                    <SortIcon
                      active={posSortKey === "cashPnl"}
                      dir={posSortKey === "cashPnl" ? posSortDir : null}
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <motion.tbody
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredPositions.map((pos) => {
                const isPnlPositive = pos.cashPnl >= 0;
                const priceUp = pos.curPrice >= pos.avgPrice;
                const isExpanded = expandedRow === pos.asset;
                return (
                  <PositionRow
                    key={pos.asset}
                    pos={pos}
                    isPnlPositive={isPnlPositive}
                    priceUp={priceUp}
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
      )}
    </Card>
  );
}

function PositionRow({
  pos,
  isPnlPositive,
  priceUp,
  isExpanded,
  onToggle,
}: {
  pos: Position;
  isPnlPositive: boolean;
  priceUp: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <motion.tr
        variants={tableRowVariant}
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-surface-elevated/30",
          isExpanded && "bg-surface-elevated/20",
          isExpanded && "border-l-2 border-l-brand-500",
        )}
      >
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
              <p className="truncate text-foreground-secondary">{pos.title}</p>
              <span
                className={cn(
                  "text-xs",
                  pos.outcome === "Yes" ? "text-emerald-400" : "text-red-400",
                )}
              >
                {pos.outcome.toLowerCase()}
              </span>
            </div>
          </div>
        </td>
        <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-mono text-foreground-secondary sm:table-cell">
          {pos.size.toFixed(2)}
        </td>
        <td className="hidden whitespace-nowrap px-4 py-2.5 text-right font-mono text-foreground-secondary md:table-cell">
          {(pos.avgPrice * 100).toFixed(1)}¢
        </td>
        <td
          className={cn(
            "hidden whitespace-nowrap px-4 py-2.5 text-right font-mono md:table-cell",
            priceUp ? "text-emerald-400" : "text-red-400",
          )}
        >
          {(pos.curPrice * 100).toFixed(1)}¢
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-foreground-secondary sm:px-4">
          {formatUsd(pos.currentValue)}
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-2 py-2.5 text-right font-mono sm:px-4",
            isPnlPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isPnlPositive ? "+" : ""}
          {formatUsd(pos.cashPnl)}{" "}
          <span className="hidden text-xs text-foreground-muted sm:inline">
            {isPnlPositive ? "+" : ""}
            {pos.percentPnl.toFixed(1)}%
          </span>
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={6} className="p-0">
              <MarketDetail
                conditionId={pos.conditionId}
                tokenId={pos.asset}
              />
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}
