import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn, formatUsd } from "@/lib/utils";
import type { ClobClient, OpenOrder } from "@polymarket/clob-client";
import { useCancelOrder } from "@/hooks/useCancelOrder";

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
        <h2 className="text-lg font-bold text-white">open orders</h2>
        <div className="mt-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-white">open orders</h2>
      <p className="mt-1 text-sm text-gray-500">your pending limit orders</p>

      {orders.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-surface-dark-3 py-12 text-gray-600">
          <p className="text-sm">no open orders</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {orders.map((order) => {
            const priceNum = parseFloat(order.price);
            const sizeNum = parseFloat(order.original_size);
            const total = priceNum * sizeNum;
            const isBuy = order.side === "BUY";
            const isCancelling = cancellingId === order.id;

            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-surface-dark-3 bg-surface-dark-2 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      isBuy
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400",
                    )}
                  >
                    {order.side.toLowerCase()}
                  </span>
                  <div className="text-xs text-gray-400">
                    <span className="font-mono">
                      {sizeNum.toFixed(1)} shares
                    </span>
                    <span className="mx-1 text-gray-600">@</span>
                    <span className="font-mono">
                      {(priceNum * 100).toFixed(0)}\u00a2
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-300">
                    {formatUsd(total)}
                  </span>
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={isCancelling || !clobClient}
                    className="btn-ghost text-xs text-red-400 hover:text-red-300"
                  >
                    {isCancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "cancel"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
