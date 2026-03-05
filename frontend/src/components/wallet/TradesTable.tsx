import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { WalletTrade } from "@/lib/api";
import { formatUsd } from "@/lib/utils";
import { Card, Spinner, EmptyState, Tabs, SideBadge } from "@/components/ui";
import { staggerContainer, tableRowVariant } from "@/lib/motion";
import { MarketDetail } from "./MarketDetail";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ArrowUpRight,
} from "lucide-react";

type SideFilter = "all" | "buy" | "sell";
type TradeSortKey = "amount" | "price";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active || dir === null)
    return <ChevronsUpDown className="h-3 w-3 text-foreground-muted" />;
  if (dir === "desc") return <ChevronDown className="h-3 w-3 text-brand-400" />;
  return <ChevronUp className="h-3 w-3 text-brand-400" />;
}

interface TradesTableProps {
  trades: WalletTrade[] | undefined;
  total: number;
  isLoading: boolean;
  address: string;
  tradesPage: number;
  onPageChange: (page: number) => void;
}

export function TradesTable({
  trades,
  total,
  isLoading,
  address,
  tradesPage,
  onPageChange,
}: TradesTableProps) {
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [tradeSortKey, setTradeSortKey] = useState<TradeSortKey | null>(null);
  const [tradeSortDir, setTradeSortDir] = useState<SortDir>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleTradeSort = (key: TradeSortKey) => {
    if (tradeSortKey !== key) {
      setTradeSortKey(key);
      setTradeSortDir("desc");
    } else if (tradeSortDir === "desc") {
      setTradeSortDir("asc");
    } else {
      setTradeSortKey(null);
    }
  };

  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let result = [...trades];
    if (sideFilter !== "all") {
      result = result.filter(
        (t) => t.side.toUpperCase() === sideFilter.toUpperCase(),
      );
    }
    if (tradeSortKey) {
      const dir = tradeSortDir === "asc" ? 1 : -1;
      if (tradeSortKey === "amount") {
        result.sort((a, b) => (a.size * a.price - b.size * b.price) * dir);
      } else {
        result.sort((a, b) => (a.price - b.price) * dir);
      }
    }
    return result;
  }, [trades, sideFilter, tradeSortKey, tradeSortDir]);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <h2 className="text-base font-bold text-foreground sm:text-lg">
          trade history
        </h2>
        <Tabs
          value={sideFilter}
          onChange={setSideFilter}
          options={[
            { value: "all" as SideFilter, label: "all" },
            { value: "buy" as SideFilter, label: "buy" },
            { value: "sell" as SideFilter, label: "sell" },
          ]}
          layoutId="trades-side-filter"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !trades?.length ? (
        <EmptyState icon={Activity} title="no trades found" />
      ) : filteredTrades.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-foreground-muted">
          <p className="text-sm">no {sideFilter} trades</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-white/[0.04] px-3 py-2 text-xs text-foreground-muted sm:gap-4 sm:px-4">
            <span className="hidden w-16 shrink-0 sm:block">date</span>
            <span className="w-10 shrink-0">side</span>
            <span className="min-w-0 flex-1">market</span>
            <button
              onClick={() => handleTradeSort("amount")}
              className="inline-flex w-24 shrink-0 items-center justify-end gap-1 transition-colors hover:text-foreground"
            >
              amount
              <SortIcon
                active={tradeSortKey === "amount"}
                dir={tradeSortKey === "amount" ? tradeSortDir : null}
              />
            </button>
            <button
              onClick={() => handleTradeSort("price")}
              className="hidden w-16 shrink-0 items-center justify-end gap-1 transition-colors hover:text-foreground sm:inline-flex"
            >
              price
              <SortIcon
                active={tradeSortKey === "price"}
                dir={tradeSortKey === "price" ? tradeSortDir : null}
              />
            </button>
            <span className="w-8 shrink-0" />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="divide-y divide-white/[0.04]"
          >
            {filteredTrades.map((trade) => {
              const isExpanded = expandedRow === trade.transaction_hash;
              return (
                <TradeRow
                  key={trade.transaction_hash}
                  trade={trade}
                  address={address}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedRow(isExpanded ? null : trade.transaction_hash)
                  }
                />
              );
            })}
          </motion.div>

          <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-3 sm:px-4">
            <span className="text-xs text-foreground-muted">
              {total} total trades
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, tradesPage - 1))}
                disabled={tradesPage === 0}
                className="btn-ghost text-xs disabled:opacity-30"
              >
                prev
              </button>
              <span className="text-xs text-foreground-secondary">
                page {tradesPage + 1}
              </span>
              <button
                onClick={() => onPageChange(tradesPage + 1)}
                disabled={(tradesPage + 1) * 50 >= total}
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

function TradeRow({
  trade,
  address,
  isExpanded,
  onToggle,
}: {
  trade: WalletTrade;
  address: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(trade.timestamp * 1000);

  return (
    <>
      <motion.div
        variants={tableRowVariant}
        onClick={onToggle}
        className={`flex cursor-pointer items-center gap-2 px-3 py-3 transition-colors hover:bg-surface-elevated/30 sm:gap-4 sm:px-4 ${
          isExpanded
            ? "bg-surface-elevated/20 border-l-2 border-l-brand-500"
            : ""
        }`}
      >
        <span className="hidden w-16 shrink-0 font-mono text-xs text-foreground-muted sm:block">
          {time.toLocaleDateString([], { month: "short", day: "numeric" })}
        </span>
        <SideBadge side={trade.side} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground-secondary">
            {trade.title || trade.condition_id.slice(0, 20) + "..."}
          </p>
          {trade.outcome && (
            <span className="ml-2 text-xs text-foreground-muted">
              {trade.outcome.toLowerCase()}
            </span>
          )}
        </div>
        <div className="w-24 shrink-0 text-right">
          <p className="font-mono text-sm text-foreground-secondary">
            {formatUsd(trade.size * trade.price)}
          </p>
        </div>
        <div className="hidden w-16 shrink-0 text-right sm:block">
          <p className="font-mono text-xs text-foreground-muted">
            {(trade.price * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="w-8 shrink-0 text-right">
          <Link
            to={`/copytrade?target=${address}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-elevated/60 hover:text-brand-400"
            title="copy this trader"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MarketDetail
              conditionId={trade.condition_id}
              tokenId={trade.asset_id}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
