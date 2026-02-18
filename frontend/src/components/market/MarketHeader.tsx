import type { MarketSummary } from "@/lib/api";
import { formatCompact } from "@/lib/utils";
import { Clock, TrendingUp, Droplets } from "lucide-react";

interface MarketHeaderProps {
  market: MarketSummary;
}

export function MarketHeader({ market }: MarketHeaderProps) {
  return (
    <div className="card">
      <div className="flex items-start gap-4">
        {market.image ? (
          <img
            src={market.image}
            alt=""
            className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-surface-dark-2">
            <TrendingUp className="h-7 w-7 text-gray-500" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-snug text-white">
            {market.question}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {market.category && (
              <span className="badge-blue">{market.category}</span>
            )}
            {market.end_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(market.end_date).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              vol: {formatCompact(market.volume)}
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              liq: {formatCompact(market.liquidity)}
            </span>
            {market.closed && <span className="badge-red">closed</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
