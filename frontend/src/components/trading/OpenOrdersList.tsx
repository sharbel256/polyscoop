import { useState } from "react";
import { motion } from "framer-motion";
import { cn, formatUsd } from "@/lib/utils";
import type { ClobClient, OpenOrder } from "@polymarket/clob-client";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { Spinner } from "@/components/ui";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface OpenOrdersListProps {
  orders: OpenOrder[];
  isLoading: boolean;
  clobClient: ClobClient | null;
}

export function OpenOrdersList({
  orders,
  isLoading,
  clobClient,
}: OpenOrdersListProps) {
  const cancelOrder = useCancelOrder();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    if (!clobClient) return;
    setCancellingId(orderId);

    try {
      await cancelOrder.mutateAsync({ clobClient, orderID: orderId });
    } catch {
      // error handled inline
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-foreground">open orders</h2>
        <div className="mt-6 flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-foreground">open orders</h2>
      <p className="mt-1 text-sm text-foreground-muted">your pending limit orders</p>

      {orders.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-12 text-foreground-muted">
          <p className="text-sm">no open orders</p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-4 space-y-2"
        >
          {orders.map((order) => {
            const priceNum = parseFloat(order.price);
            const sizeNum = parseFloat(order.original_size);
            const total = priceNum * sizeNum;
            const isBuy = order.side === "BUY";
            const isCancelling = cancellingId === order.id;

            return (
              <motion.div
                key={order.id}
                variants={staggerItem}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-surface-elevated/40 px-3 py-3 sm:px-4"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
                      isBuy
                        ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
                        : "bg-red-500/20 text-red-400 ring-red-500/30",
                    )}
                  >
                    {order.side.toLowerCase()}
                  </span>
                  <div className="text-xs text-foreground-secondary">
                    <span className="font-mono">
                      {sizeNum.toFixed(1)} shares
                    </span>
                    <span className="mx-1 text-foreground-muted">@</span>
                    <span className="font-mono">
                      {(priceNum * 100).toFixed(0)}\u00a2
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="font-mono text-xs text-foreground-secondary">
                    {formatUsd(total)}
                  </span>
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isCancelling || !clobClient}
                    className="btn-ghost text-xs text-red-400 hover:text-red-300 hover:shadow-[0_0_12px_rgba(248,113,113,0.15)]"
                  >
                    {isCancelling ? <Spinner size="sm" /> : "cancel"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {cancelOrder.error && (
        <p className="mt-3 text-xs text-red-400">
          {cancelOrder.error instanceof Error
            ? cancelOrder.error.message
            : "cancel failed"}
        </p>
      )}
    </div>
  );
}
