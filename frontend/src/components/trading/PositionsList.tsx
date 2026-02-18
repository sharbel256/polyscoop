import { useState } from "react";
import { Loader2, Briefcase } from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";
import type { Position } from "@/lib/api";
import type { ClobClient } from "@polymarket/clob-client";
import { useCreateOrder } from "@/hooks/useCreateOrder";

interface PositionsListProps {
  positions: Position[];
  isLoading: boolean;
  clobClient: ClobClient | null;
}

export function PositionsList({
  positions,
  isLoading,
  clobClient,
}: PositionsListProps) {
  const createOrder = useCreateOrder();
  const [sellingAsset, setSellingAsset] = useState<string | null>(null);

  const handleSell = async (position: Position) => {
    if (!clobClient) return;
    setSellingAsset(position.asset);

    try {
      await createOrder.mutateAsync({
        clobClient,
        tokenId: position.asset,
        side: "SELL",
        size: position.size,
        isMarketOrder: true,
        negRisk: false,
      });
    } catch {
      // error displayed inline
    } finally {
      setSellingAsset(null);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-white">positions</h2>
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-white">positions</h2>
      <p className="mt-1 text-sm text-gray-500">
        your active prediction market positions
      </p>

      {positions.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-surface-dark-3 py-16 text-gray-600">
          <div className="text-center">
            <Briefcase className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">no positions yet</p>
            <p className="mt-1 text-xs text-gray-700">
              place orders on markets to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {positions.map((pos) => {
            const isPnlPositive = pos.cashPnl >= 0;
            const isSelling = sellingAsset === pos.asset;

            return (
              <div
                key={pos.asset}
                className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {pos.icon && (
                      <img
                        src={pos.icon}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-200 leading-snug">
                        {pos.title}
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                          pos.outcome === "Yes"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400",
                        )}
                      >
                        {pos.outcome.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSell(pos)}
                    disabled={isSelling || !clobClient}
                    className="btn-secondary text-xs"
                  >
                    {isSelling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "sell"
                    )}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>shares</span>
                    <span className="font-mono text-gray-300">
                      {pos.size.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>current price</span>
                    <span className="font-mono text-gray-300">
                      {(pos.curPrice * 100).toFixed(1)}¢
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>value</span>
                    <span className="font-mono text-gray-300">
                      {formatUsd(pos.currentValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>p&l</span>
                    <span
                      className={cn(
                        "font-mono",
                        isPnlPositive ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {isPnlPositive ? "+" : ""}
                      {formatUsd(pos.cashPnl)} ({isPnlPositive ? "+" : ""}
                      {pos.percentPnl.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOrder.error && (
        <p className="mt-3 text-xs text-red-400">
          {createOrder.error instanceof Error
            ? createOrder.error.message
            : "sell failed"}
        </p>
      )}
    </div>
  );
}
