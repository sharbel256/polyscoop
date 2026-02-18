import { Link } from "react-router-dom";
import { cn, formatCompact, formatPercent } from "@/lib/utils";
import { type MarketSummary } from "@/lib/api";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";

interface MarketCardProps {
  market: MarketSummary;
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPrice = market.tokens.find((t) => t.outcome === "Yes")?.price;
  const noPrice = market.tokens.find((t) => t.outcome === "No")?.price;

  return (
    <Link
      to={`/market/${market.condition_id}`}
      className={cn(
        "card group block w-full text-left transition-all",
        "hover:border-brand-700/50 hover:shadow-brand-900/20 hover:shadow-xl",
        "active:scale-[0.995]",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {market.image ? (
          <img
            src={market.image}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface-dark-2">
            <BarChart3 className="h-6 w-6 text-gray-500" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-100 group-hover:text-white">
            {market.question}
          </h3>

          {/* Category + End date */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            {market.category && (
              <span className="badge-blue">{market.category}</span>
            )}
            {market.end_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(market.end_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price bar */}
      <div className="mt-4 flex items-center gap-3">
        {/* Yes */}
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-400">yes</span>
            <span className="font-mono font-semibold text-emerald-400">
              {yesPrice != null ? formatPercent(yesPrice) : "–"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-dark-3">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(yesPrice ?? 0) * 100}%` }}
            />
          </div>
        </div>

        {/* No */}
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-red-400">no</span>
            <span className="font-mono font-semibold text-red-400">
              {noPrice != null ? formatPercent(noPrice) : "–"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-dark-3">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${(noPrice ?? 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-surface-dark-3 pt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          vol: {formatCompact(market.volume)}
        </span>
        <span>liq: {formatCompact(market.liquidity)}</span>
        {market.closed && <span className="badge-red">closed</span>}
        {!market.active && !market.closed && (
          <span className="badge-gray">inactive</span>
        )}
      </div>
    </Link>
  );
}
