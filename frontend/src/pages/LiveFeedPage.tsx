import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveTrades } from "@/hooks/useLiveTrades";
import { fetchFeedTrades, type FeedTrade } from "@/lib/api";
import { cn, formatUsd, shortenAddress } from "@/lib/utils";
import { Activity, Loader2, Wifi, WifiOff } from "lucide-react";

const WHALE_THRESHOLD = 500; // USD value

export function LiveFeedPage() {
  const { trades: liveTrades, connected } = useLiveTrades();
  const [initialTrades, setInitialTrades] = useState<FeedTrade[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial trades via REST
  useEffect(() => {
    fetchFeedTrades(100)
      .then((res) => setInitialTrades(res.trades))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Merge live + initial, dedup by tx hash
  const allTrades = (() => {
    const seen = new Set<string>();
    const merged: FeedTrade[] = [];
    for (const t of [...liveTrades, ...initialTrades]) {
      if (!seen.has(t.transaction_hash)) {
        seen.add(t.transaction_hash);
        merged.push(t);
      }
    }
    return merged.slice(0, 200);
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Activity className="h-6 w-6 text-brand-500" />
            live feed
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            real-time trades on mentions markets
          </p>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
            connected
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400",
          )}
        >
          {connected ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          {connected ? "connected" : "reconnecting..."}
        </div>
      </div>

      {/* Trade Feed */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : allTrades.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-600">
            <div className="text-center">
              <Activity className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">waiting for trades...</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-surface-dark-3/50">
            {allTrades.map((trade) => {
              const isBuy = trade.side.toUpperCase() === "BUY";
              const value = trade.size * trade.price;
              const isWhale = value >= WHALE_THRESHOLD;
              const time = new Date(trade.timestamp * 1000);

              return (
                <div
                  key={trade.transaction_hash}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors",
                    isWhale && "bg-yellow-500/5",
                  )}
                >
                  {/* Time */}
                  <span className="w-16 shrink-0 font-mono text-xs text-gray-600">
                    {time.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  {/* Side badge */}
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

                  {/* Market */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-300">
                      {trade.title || trade.condition_id.slice(0, 16) + "..."}
                    </p>
                    {trade.outcome && (
                      <span className="text-xs text-gray-600">
                        {trade.outcome.toLowerCase()}
                      </span>
                    )}
                  </div>

                  {/* Wallet */}
                  <Link
                    to={`/wallet/${trade.wallet}`}
                    className="shrink-0 font-mono text-xs text-brand-400 hover:text-brand-300"
                  >
                    {shortenAddress(trade.wallet)}
                  </Link>

                  {/* Size / Value */}
                  <div className="w-24 shrink-0 text-right">
                    <p
                      className={cn(
                        "font-mono text-sm",
                        isWhale ? "font-bold text-yellow-400" : "text-gray-300",
                      )}
                    >
                      {formatUsd(value)}
                    </p>
                    <p className="font-mono text-xs text-gray-600">
                      {trade.size.toFixed(1)} @ {(trade.price * 100).toFixed(0)}
                      ¢
                    </p>
                  </div>

                  {/* Whale indicator */}
                  {isWhale && (
                    <span className="text-xs text-yellow-500" title="whale">
                      🐋
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
