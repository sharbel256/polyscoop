import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWalletPositions } from "@/hooks/useWalletPositions";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useWalletTrades } from "@/hooks/useWalletTrades";
import {
  useMarket,
  useOrderbook,
  usePriceHistory,
} from "@/hooks/useMarketData";
import type { Position, WalletTrade } from "@/lib/api";
import { cn, formatUsd, shortenAddress, formatCompact } from "@/lib/utils";
import {
  Loader2,
  Search,
  Copy,
  Check,
  ExternalLink,
  Briefcase,
  ArrowLeft,
  Activity,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ArrowUpRight,
} from "lucide-react";

type Tab = "positions" | "trades";
type SortDir = "asc" | "desc";
type PositionSortKey = "size" | "currentValue" | "cashPnl";
type TradeSortKey = "amount" | "price";
type SideFilter = "all" | "buy" | "sell";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
  if (!active || dir === null)
    return <ChevronsUpDown className="h-3 w-3 text-gray-600" />;
  if (dir === "desc") return <ChevronDown className="h-3 w-3 text-brand-400" />;
  return <ChevronUp className="h-3 w-3 text-brand-400" />;
}

/* ── Expanded detail panel ────────────────────────────────── */

function MarketDetailPanel({
  conditionId,
  tokenId,
}: {
  conditionId: string;
  tokenId?: string;
}) {
  const { data: market, isLoading: marketLoading } = useMarket(conditionId);
  const { data: orderbook, isLoading: orderbookLoading } =
    useOrderbook(tokenId);
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(tokenId);

  if (marketLoading || orderbookLoading || priceLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }

  // Price sparkline — simple SVG area
  const points = priceData?.history ?? [];
  let sparklinePath = "";
  let areaPath = "";
  if (points.length > 1) {
    const minP = Math.min(...points.map((p) => p.p));
    const maxP = Math.max(...points.map((p) => p.p));
    const rangeP = maxP - minP || 1;
    const w = 200;
    const h = 60;
    const coords = points.map((pt, i) => ({
      x: (i / (points.length - 1)) * w,
      y: h - ((pt.p - minP) / rangeP) * h,
    }));
    sparklinePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`)
      .join(" ");
    areaPath = `${sparklinePath} L${w},${h} L0,${h} Z`;
  }

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-surface-dark-3 bg-surface-dark-1 px-4 py-4 sm:grid-cols-3">
      {/* Market info */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">market</p>
        {market ? (
          <>
            <p className="text-sm text-gray-200">{market.question}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>vol: {formatUsd(market.volume)}</span>
              <span>liq: {formatUsd(market.liquidity)}</span>
            </div>
            <a
              href={`https://polymarket.com/event/${market.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
            >
              view on polymarket
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : (
          <p className="text-xs text-gray-600">market data unavailable</p>
        )}
      </div>

      {/* Orderbook summary */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">orderbook</p>
        {orderbook ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">best bid</span>
              <span className="font-mono text-emerald-400">
                {orderbook.mid_price != null
                  ? `${((orderbook.mid_price - (orderbook.spread ?? 0) / 2) * 100).toFixed(1)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">best ask</span>
              <span className="font-mono text-red-400">
                {orderbook.mid_price != null
                  ? `${((orderbook.mid_price + (orderbook.spread ?? 0) / 2) * 100).toFixed(1)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">spread</span>
              <span className="font-mono text-gray-300">
                {orderbook.spread != null
                  ? `${(orderbook.spread * 100).toFixed(2)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">depth imbalance</span>
              <span className="font-mono text-gray-300">
                {orderbook.imbalance_ratio != null
                  ? `${(orderbook.imbalance_ratio * 100).toFixed(0)}% bid`
                  : "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600">no orderbook data</p>
        )}
      </div>

      {/* Price sparkline */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">price (1h)</p>
        {points.length > 1 ? (
          <svg viewBox="0 0 200 60" className="h-[60px] w-full">
            <path d={areaPath} fill="rgba(139,92,246,0.15)" />
            <path
              d={sparklinePath}
              fill="none"
              stroke="rgb(139,92,246)"
              strokeWidth="1.5"
            />
          </svg>
        ) : (
          <p className="text-xs text-gray-600">no price data</p>
        )}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */

export function WalletPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("positions");
  const [tradesPage, setTradesPage] = useState(0);

  // Positions filter/sort state
  const [posSearch, setPosSearch] = useState("");
  const [posSortKey, setPosSortKey] = useState<PositionSortKey | null>(null);
  const [posSortDir, setPosSortDir] = useState<SortDir>("desc");

  // Trades filter/sort state
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [tradeSortKey, setTradeSortKey] = useState<TradeSortKey | null>(null);
  const [tradeSortDir, setTradeSortDir] = useState<SortDir>("desc");

  // Expanded row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: positions, isLoading: positionsLoading } =
    useWalletPositions(address);
  const { data: profile, isLoading: profileLoading } =
    useWalletProfile(address);
  const { data: tradesData, isLoading: tradesLoading } = useWalletTrades(
    address,
    50,
    tradesPage * 50,
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      navigate(`/wallet/${trimmed}`);
      setSearchInput("");
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  // Filtered + sorted positions
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

  // Filtered + sorted trades
  const filteredTrades = useMemo(() => {
    if (!tradesData?.trades) return [];
    let result = [...tradesData.trades];

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
  }, [tradesData?.trades, sideFilter, tradeSortKey, tradeSortDir]);

  // Get the 7d score for the stats header
  const score7d = profile?.scores?.["7d"];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to dashboard
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">wallet inspector</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold text-white">
                {address ? shortenAddress(address, 6) : "—"}
              </h1>
              {address && (
                <>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-dark-2 hover:text-gray-300"
                    title="copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={`https://polygonscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-dark-2 hover:text-gray-300"
                    title="view on polygonscan"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Search for different address */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="look up address..."
                className="input pl-9"
                style={{ maxWidth: "300px" }}
              />
            </div>
            <button type="submit" className="btn-secondary text-xs">
              search
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      {!profileLoading && profile && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <BarChart3 className="h-3.5 w-3.5" />
              total volume
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white">
              {formatUsd(profile.total_volume)}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Activity className="h-3.5 w-3.5" />
              total trades
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white">
              {formatCompact(profile.total_trades)}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="h-3.5 w-3.5" />
              7d volume
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white">
              {score7d ? formatUsd(score7d.volume) : "—"}
            </p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="h-3.5 w-3.5" />
              7d rank
            </div>
            <p className="mt-1 font-mono text-lg font-bold text-white">
              {score7d?.rank_volume ? `#${score7d.rank_volume}` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Copy wallet button */}
      {address && (
        <Link
          to={`/copytrade?target=${address}`}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Copy className="h-4 w-4" />
          copy this wallet
        </Link>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-dark-2 p-1 w-fit">
        <button
          onClick={() => setTab("positions")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "positions"
              ? "bg-brand-700 text-white"
              : "text-gray-400 hover:text-white",
          )}
        >
          positions
        </button>
        <button
          onClick={() => setTab("trades")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "trades"
              ? "bg-brand-700 text-white"
              : "text-gray-400 hover:text-white",
          )}
        >
          trade history
        </button>
      </div>

      {/* Positions Tab */}
      {tab === "positions" && (
        <div className="card overflow-hidden p-0">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-surface-dark-3 px-4 py-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="filter by market title..."
                className="input w-full pl-9 text-xs"
              />
            </div>
          </div>

          {positionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : !positions || positions.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <div className="text-center">
                <Briefcase className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">no active positions</p>
              </div>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <p className="text-sm">
                no positions match &quot;{posSearch}&quot;
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-dark-3 text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5">market</th>
                    <th className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handlePositionSort("size")}
                        className="inline-flex items-center gap-1 transition-colors hover:text-white"
                      >
                        shares
                        <SortIcon
                          active={posSortKey === "size"}
                          dir={posSortKey === "size" ? posSortDir : null}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right">entry</th>
                    <th className="px-4 py-2.5 text-right">current</th>
                    <th className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handlePositionSort("currentValue")}
                        className="inline-flex items-center gap-1 transition-colors hover:text-white"
                      >
                        value
                        <SortIcon
                          active={posSortKey === "currentValue"}
                          dir={
                            posSortKey === "currentValue" ? posSortDir : null
                          }
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handlePositionSort("cashPnl")}
                        className="inline-flex items-center gap-1 transition-colors hover:text-white"
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
                <tbody>
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trades Tab */}
      {tab === "trades" && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-surface-dark-3 px-4 py-3">
            <h2 className="text-lg font-bold text-white">trade history</h2>
            {/* Side filter */}
            <div className="flex items-center gap-1 rounded-lg bg-surface-dark-2 p-0.5">
              {(["all", "buy", "sell"] as SideFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSideFilter(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    sideFilter === s
                      ? "bg-brand-700 text-white"
                      : "text-gray-500 hover:text-white",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {tradesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : !tradesData?.trades.length ? (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <div className="text-center">
                <Activity className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">no trades found</p>
              </div>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <p className="text-sm">no {sideFilter} trades</p>
            </div>
          ) : (
            <>
              {/* Sortable header */}
              <div className="flex items-center gap-4 border-b border-surface-dark-3/50 px-4 py-2 text-xs text-gray-500">
                <span className="w-16 shrink-0">date</span>
                <span className="w-10 shrink-0">side</span>
                <span className="min-w-0 flex-1">market</span>
                <button
                  onClick={() => handleTradeSort("amount")}
                  className="inline-flex w-24 shrink-0 items-center justify-end gap-1 transition-colors hover:text-white"
                >
                  amount
                  <SortIcon
                    active={tradeSortKey === "amount"}
                    dir={tradeSortKey === "amount" ? tradeSortDir : null}
                  />
                </button>
                <button
                  onClick={() => handleTradeSort("price")}
                  className="inline-flex w-16 shrink-0 items-center justify-end gap-1 transition-colors hover:text-white"
                >
                  price
                  <SortIcon
                    active={tradeSortKey === "price"}
                    dir={tradeSortKey === "price" ? tradeSortDir : null}
                  />
                </button>
                <span className="w-8 shrink-0" />
              </div>

              <div className="divide-y divide-surface-dark-3/50">
                {filteredTrades.map((trade) => {
                  const isExpanded = expandedRow === trade.transaction_hash;
                  return (
                    <TradeRow
                      key={trade.transaction_hash}
                      trade={trade}
                      address={address!}
                      isExpanded={isExpanded}
                      onToggle={() =>
                        setExpandedRow(
                          isExpanded ? null : trade.transaction_hash,
                        )
                      }
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-surface-dark-3 px-4 py-3">
                <span className="text-xs text-gray-500">
                  {tradesData.total} total trades
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTradesPage((p) => Math.max(0, p - 1))}
                    disabled={tradesPage === 0}
                    className="btn-ghost text-xs disabled:opacity-30"
                  >
                    prev
                  </button>
                  <span className="text-xs text-gray-400">
                    page {tradesPage + 1}
                  </span>
                  <button
                    onClick={() => setTradesPage((p) => p + 1)}
                    disabled={(tradesPage + 1) * 50 >= tradesData.total}
                    className="btn-ghost text-xs disabled:opacity-30"
                  >
                    next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Position row (with expandable detail) ────────────────── */

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
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-surface-dark-3/50 transition-colors hover:bg-surface-dark-2/50",
          isExpanded && "bg-surface-dark-2/30",
        )}
      >
        <td className="max-w-[260px] px-4 py-2.5">
          <div className="flex items-center gap-2">
            {pos.icon && (
              <img
                src={pos.icon}
                alt=""
                className="h-6 w-6 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-gray-200">{pos.title}</p>
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
        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-gray-300">
          {pos.size.toFixed(2)}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-gray-400">
          {(pos.avgPrice * 100).toFixed(1)}¢
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-4 py-2.5 text-right font-mono",
            priceUp ? "text-emerald-400" : "text-red-400",
          )}
        >
          {(pos.curPrice * 100).toFixed(1)}¢
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-gray-300">
          {formatUsd(pos.currentValue)}
        </td>
        <td
          className={cn(
            "whitespace-nowrap px-4 py-2.5 text-right font-mono",
            isPnlPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isPnlPositive ? "+" : ""}
          {formatUsd(pos.cashPnl)}{" "}
          <span className="text-xs text-gray-500">
            {isPnlPositive ? "+" : ""}
            {pos.percentPnl.toFixed(1)}%
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <MarketDetailPanel
              conditionId={pos.conditionId}
              tokenId={pos.asset}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Trade row (with expandable detail + copy button) ──── */

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
  const isBuy = trade.side.toUpperCase() === "BUY";
  const time = new Date(trade.timestamp * 1000);

  return (
    <>
      <div
        onClick={onToggle}
        className={cn(
          "flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-dark-2/50",
          isExpanded && "bg-surface-dark-2/30",
        )}
      >
        <span className="w-16 shrink-0 font-mono text-xs text-gray-600">
          {time.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span
          className={cn(
            "w-10 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-bold",
            isBuy
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400",
          )}
        >
          {isBuy ? "buy" : "sell"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-300">
            {trade.title || trade.condition_id.slice(0, 20) + "..."}
          </p>
          {trade.outcome && (
            <span className="ml-2 text-xs text-gray-600">
              {trade.outcome.toLowerCase()}
            </span>
          )}
        </div>
        <div className="w-24 shrink-0 text-right">
          <p className="font-mono text-sm text-gray-300">
            {formatUsd(trade.size * trade.price)}
          </p>
        </div>
        <div className="w-16 shrink-0 text-right">
          <p className="font-mono text-xs text-gray-500">
            {(trade.price * 100).toFixed(0)}¢
          </p>
        </div>
        <div className="w-8 shrink-0 text-right">
          <Link
            to={`/copytrade?target=${address}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex rounded-md p-1 text-gray-600 transition-colors hover:bg-surface-dark-2 hover:text-brand-400"
            title="copy this trader"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      {isExpanded && (
        <MarketDetailPanel
          conditionId={trade.condition_id}
          tokenId={trade.asset_id}
        />
      )}
    </>
  );
}
