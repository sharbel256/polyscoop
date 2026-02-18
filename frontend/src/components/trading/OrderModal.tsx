import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import type { MarketSummary } from "@/lib/api";
import type { ClobClient } from "@polymarket/clob-client";
import { useCreateOrder } from "@/hooks/useCreateOrder";

interface OrderModalProps {
  market: MarketSummary;
  clobClient: ClobClient | null;
  isSessionActive: boolean;
  onClose: () => void;
}

type Outcome = "yes" | "no";
type OrderType = "market" | "limit";

export function OrderModal({
  market,
  clobClient,
  isSessionActive,
  onClose,
}: OrderModalProps) {
  const [outcome, setOutcome] = useState<Outcome>("yes");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const createOrder = useCreateOrder();

  const yesToken = market.tokens.find((t) => t.outcome === "Yes");
  const noToken = market.tokens.find((t) => t.outcome === "No");
  const selectedToken = outcome === "yes" ? yesToken : noToken;
  const currentPrice = selectedToken?.price ?? 0;

  // pre-fill price when switching to limit or changing outcome
  useEffect(() => {
    if (orderType === "limit") {
      setPrice(currentPrice.toFixed(2));
    }
  }, [orderType, outcome, currentPrice]);

  const sizeNum = parseFloat(size) || 0;
  const priceNum =
    orderType === "limit" ? parseFloat(price) || 0 : currentPrice;
  const estimatedCost = sizeNum * priceNum;

  const canSubmit =
    isSessionActive &&
    clobClient &&
    sizeNum > 0 &&
    (orderType === "market" || (priceNum > 0 && priceNum <= 0.99)) &&
    !createOrder.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedToken || !clobClient) return;

    try {
      await createOrder.mutateAsync({
        clobClient,
        tokenId: selectedToken.token_id,
        side: "BUY",
        size: sizeNum,
        price: orderType === "limit" ? priceNum : undefined,
        isMarketOrder: orderType === "market",
        negRisk: market.neg_risk,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      // error is available via createOrder.error
    }
  };

  // close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (showSuccess) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="card w-full max-w-md text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-3 text-lg font-semibold text-white">order placed</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {market.image && (
              <img
                src={market.image}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="text-sm font-semibold text-white leading-snug">
                {market.question}
              </h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span>
                  yes:{" "}
                  <span className="font-mono text-emerald-400">
                    {yesToken?.price != null
                      ? formatPercent(yesToken.price)
                      : "–"}
                  </span>
                </span>
                <span>
                  no:{" "}
                  <span className="font-mono text-red-400">
                    {noToken?.price != null
                      ? formatPercent(noToken.price)
                      : "–"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-surface-dark-3 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isSessionActive ? (
          <div className="mt-6 rounded-xl border border-dashed border-surface-dark-3 py-8 text-center text-gray-500">
            <p className="text-sm">trading session not active</p>
            <p className="mt-1 text-xs text-gray-600">
              initialize your trading session to place orders
            </p>
          </div>
        ) : (
          <>
            {/* outcome selector */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOutcome("yes")}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  outcome === "yes"
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                    : "bg-surface-dark-2 text-gray-500 hover:text-gray-300",
                )}
              >
                yes
              </button>
              <button
                onClick={() => setOutcome("no")}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  outcome === "no"
                    ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                    : "bg-surface-dark-2 text-gray-500 hover:text-gray-300",
                )}
              >
                no
              </button>
            </div>

            {/* order type tabs */}
            <div className="mt-4 flex gap-1 rounded-xl bg-surface-dark-2 p-1">
              {(["market", "limit"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                    orderType === t
                      ? "bg-brand-700 text-white"
                      : "text-gray-400 hover:text-gray-200",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* size input */}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500">
                shares
              </label>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                className="input mt-1 w-full"
              />
            </div>

            {/* price input (limit only) */}
            {orderType === "limit" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-500">
                  price
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  className="input mt-1 w-full"
                />
              </div>
            )}

            {/* estimated cost */}
            {sizeNum > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>estimated cost</span>
                <span className="font-mono text-gray-300">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
            )}

            {/* error */}
            {createOrder.error && (
              <p className="mt-3 text-xs text-red-400">
                {createOrder.error instanceof Error
                  ? createOrder.error.message
                  : "order failed"}
              </p>
            )}

            {/* submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                outcome === "yes"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:text-emerald-400/50"
                  : "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/30 disabled:text-red-400/50",
              )}
            >
              {createOrder.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                `buy ${outcome} @ ${(priceNum * 100).toFixed(0)}\u00a2`
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
