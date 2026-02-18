import { Link } from "react-router-dom";
import type { TradeRecord } from "@/lib/api";
import { cn, shortenAddress } from "@/lib/utils";

interface TradeTapeProps {
  trades: TradeRecord[];
}

export function TradeTape({ trades }: TradeTapeProps) {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">trade tape</h3>
        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
          no trades yet
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-gray-300">trade tape</h3>
      <div className="max-h-72 space-y-px overflow-y-auto">
        {trades.map((trade, i) => {
          const isBuy = trade.side.toUpperCase() === "BUY";
          const time = trade.timestamp
            ? new Date(trade.timestamp * 1000).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "";

          return (
            <div
              key={`${trade.transaction_hash}-${i}`}
              className="flex items-center gap-2 rounded bg-surface-dark-2 px-2 py-1.5 text-xs"
            >
              <span
                className={cn(
                  "w-8 font-semibold",
                  isBuy ? "text-emerald-400" : "text-red-400",
                )}
              >
                {isBuy ? "buy" : "sell"}
              </span>
              <span className="font-mono text-gray-300">
                {(trade.price * 100).toFixed(1)}¢
              </span>
              <span className="font-mono text-gray-500">
                {trade.size.toFixed(2)}
              </span>
              <span className="text-gray-600">{time}</span>
              {trade.wallet && (
                <Link
                  to={`/wallet/${trade.wallet}`}
                  className="ml-auto font-mono text-brand-400 hover:text-brand-300"
                  title={trade.wallet}
                >
                  {shortenAddress(trade.wallet, 3)}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
