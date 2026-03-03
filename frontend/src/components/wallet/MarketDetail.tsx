import { motion } from "framer-motion";
import {
  useMarket,
  useOrderbook,
  usePriceHistory,
} from "@/hooks/useMarketData";
import { formatUsd } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { fadeIn } from "@/lib/motion";
import { ExternalLink } from "lucide-react";

interface MarketDetailProps {
  conditionId: string;
  tokenId?: string;
}

export function MarketDetail({ conditionId, tokenId }: MarketDetailProps) {
  const { data: market, isLoading: marketLoading } = useMarket(conditionId);
  const { data: orderbook, isLoading: orderbookLoading } =
    useOrderbook(tokenId);
  const { data: priceData, isLoading: priceLoading } =
    usePriceHistory(tokenId);

  if (marketLoading || orderbookLoading || priceLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

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
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 border-t border-white/[0.06] bg-surface-elevated/20 px-3 py-4 sm:grid-cols-3 sm:px-4"
    >
      {/* Market info */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground-muted">market</p>
        {market ? (
          <>
            <p className="text-sm text-foreground-secondary">
              {market.question}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-foreground-muted">
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
          <p className="text-xs text-foreground-muted">
            market data unavailable
          </p>
        )}
      </div>

      {/* Orderbook summary */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground-muted">orderbook</p>
        {orderbook ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground-muted">best bid</span>
              <span className="font-mono text-emerald-400">
                {orderbook.mid_price != null
                  ? `${((orderbook.mid_price - (orderbook.spread ?? 0) / 2) * 100).toFixed(1)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">best ask</span>
              <span className="font-mono text-red-400">
                {orderbook.mid_price != null
                  ? `${((orderbook.mid_price + (orderbook.spread ?? 0) / 2) * 100).toFixed(1)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">spread</span>
              <span className="font-mono text-foreground-secondary">
                {orderbook.spread != null
                  ? `${(orderbook.spread * 100).toFixed(2)}¢`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">depth imbalance</span>
              <span className="font-mono text-foreground-secondary">
                {orderbook.imbalance_ratio != null
                  ? `${(orderbook.imbalance_ratio * 100).toFixed(0)}% bid`
                  : "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground-muted">no orderbook data</p>
        )}
      </div>

      {/* Price sparkline */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground-muted">price (1h)</p>
        {points.length > 1 ? (
          <svg viewBox="0 0 200 60" className="h-[60px] w-full">
            <defs>
              <linearGradient
                id="sparkline-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="rgb(75 107 255)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(75 107 255)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sparkline-fill)" />
            <path
              d={sparklinePath}
              fill="none"
              stroke="rgb(75 107 255)"
              strokeWidth="1.5"
            />
          </svg>
        ) : (
          <p className="text-xs text-foreground-muted">no price data</p>
        )}
      </div>
    </motion.div>
  );
}
