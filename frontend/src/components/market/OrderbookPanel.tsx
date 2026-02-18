import type { OrderbookAnalysis } from "@/lib/api";
import { cn, formatCompact } from "@/lib/utils";

interface OrderbookPanelProps {
  orderbook: OrderbookAnalysis;
}

export function OrderbookPanel({ orderbook }: OrderbookPanelProps) {
  const {
    bids,
    asks,
    spread,
    mid_price,
    bid_depth,
    ask_depth,
    imbalance_ratio,
    bid_walls,
    ask_walls,
  } = orderbook;

  const wallPrices = new Set([
    ...bid_walls.map((w) => w.price),
    ...ask_walls.map((w) => w.price),
  ]);

  const imbalancePct = imbalance_ratio != null ? imbalance_ratio * 100 : 50;

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">orderbook</h3>

      {/* Imbalance bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>bid pressure</span>
          <span>ask pressure</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-dark-3">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${imbalancePct}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${100 - imbalancePct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-mono text-emerald-400">
            {formatCompact(bid_depth)}
          </span>
          {spread != null && (
            <span className="text-gray-500">
              spread: {(spread * 100).toFixed(1)}¢
            </span>
          )}
          <span className="font-mono text-red-400">
            {formatCompact(ask_depth)}
          </span>
        </div>
      </div>

      {/* Bids table */}
      <div>
        <div className="mb-1 text-xs font-medium text-emerald-400">bids</div>
        <div className="max-h-36 space-y-px overflow-y-auto">
          {bids.slice(0, 10).map((b, i) => {
            const isWall = wallPrices.has(b.price);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1 text-xs",
                  isWall
                    ? "bg-emerald-900/30 font-semibold"
                    : "bg-surface-dark-2",
                )}
              >
                <span className="font-mono text-emerald-400">
                  {(parseFloat(b.price) * 100).toFixed(1)}¢
                </span>
                <span className="font-mono text-gray-400">
                  {parseFloat(b.size).toFixed(2)}
                  {isWall && (
                    <span
                      className="ml-1 text-yellow-400"
                      title="wall detected"
                    >
                      !!
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Asks table */}
      <div>
        <div className="mb-1 text-xs font-medium text-red-400">asks</div>
        <div className="max-h-36 space-y-px overflow-y-auto">
          {asks.slice(0, 10).map((a, i) => {
            const isWall = wallPrices.has(a.price);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1 text-xs",
                  isWall ? "bg-red-900/30 font-semibold" : "bg-surface-dark-2",
                )}
              >
                <span className="font-mono text-red-400">
                  {(parseFloat(a.price) * 100).toFixed(1)}¢
                </span>
                <span className="font-mono text-gray-400">
                  {parseFloat(a.size).toFixed(2)}
                  {isWall && (
                    <span
                      className="ml-1 text-yellow-400"
                      title="wall detected"
                    >
                      !!
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mid price */}
      {mid_price != null && (
        <div className="border-t border-surface-dark-3 pt-2 text-center text-xs text-gray-500">
          mid:{" "}
          <span className="font-mono text-gray-300">
            {(mid_price * 100).toFixed(1)}¢
          </span>
        </div>
      )}
    </div>
  );
}
