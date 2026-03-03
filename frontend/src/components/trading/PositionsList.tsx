import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";
import type { Position } from "@/lib/api";
import type { ClobClient } from "@polymarket/clob-client";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { Spinner, AnimatedNumber } from "@/components/ui";
import { staggerContainer, staggerItem } from "@/lib/motion";

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
        <h2 className="text-lg font-bold text-foreground">positions</h2>
        <div className="mt-6 flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-foreground">positions</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        your active prediction market positions
      </p>

      {positions.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-16 text-foreground-muted">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
              <Briefcase className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm">no positions yet</p>
            <p className="mt-1 text-xs text-foreground-muted">
              place orders on markets to get started
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-4 space-y-3"
        >
          {positions.map((pos) => {
            const isPnlPositive = pos.cashPnl >= 0;
            const isSelling = sellingAsset === pos.asset;

            return (
              <motion.div
                key={pos.asset}
                variants={staggerItem}
                className="rounded-xl border border-white/[0.06] bg-surface-elevated/40 p-4"
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
                      <p className="text-sm font-medium leading-snug text-foreground-secondary">
                        {pos.title}
                      </p>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium ring-1",
                          pos.outcome === "Yes"
                            ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
                            : "bg-red-500/20 text-red-400 ring-red-500/30",
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
                    {isSelling ? <Spinner size="sm" /> : "sell"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-y-1 text-xs sm:grid-cols-2 sm:gap-x-4">
                  <div className="flex justify-between text-foreground-muted">
                    <span>shares</span>
                    <span className="font-mono text-foreground-secondary">
                      {pos.size.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-foreground-muted">
                    <span>current price</span>
                    <span className="font-mono text-foreground-secondary">
                      {(pos.curPrice * 100).toFixed(1)}¢
                    </span>
                  </div>
                  <div className="flex justify-between text-foreground-muted">
                    <span>value</span>
                    <AnimatedNumber
                      value={pos.currentValue}
                      format={formatUsd}
                      className="font-mono text-foreground-secondary"
                    />
                  </div>
                  <div className="flex justify-between text-foreground-muted">
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
              </motion.div>
            );
          })}
        </motion.div>
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
