import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";
import type { MarketSummary } from "@/lib/api";
import type { ClobClient } from "@polymarket/clob-client";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { Spinner } from "@/components/ui";
import { scaleIn } from "@/lib/motion";

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="card w-full max-w-md text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            order placed
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
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
                <h3 className="text-sm font-semibold leading-snug text-foreground">
                  {market.question}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-foreground-muted">
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
              className="rounded-lg p-1 text-foreground-muted hover:bg-surface-hover/60 hover:text-foreground-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isSessionActive ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/[0.06] py-8 text-center text-foreground-muted">
              <p className="text-sm">trading session not active</p>
              <p className="mt-1 text-xs text-foreground-muted">
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
                      : "bg-surface-elevated/40 text-foreground-muted hover:text-foreground-secondary",
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
                      : "bg-surface-elevated/40 text-foreground-muted hover:text-foreground-secondary",
                  )}
                >
                  no
                </button>
              </div>

              {/* order type tabs */}
              <div className="glass-subtle mt-4 flex gap-1 rounded-xl p-1">
                {(["market", "limit"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={cn(
                      "relative flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                      orderType === t
                        ? "text-white"
                        : "text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {orderType === t && (
                      <motion.div
                        layoutId="order-type-pill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">{t}</span>
                  </button>
                ))}
              </div>

              {/* size input */}
              <div className="mt-4">
                <label className="text-xs font-medium text-foreground-muted">
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
                  <label className="text-xs font-medium text-foreground-muted">
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
                <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
                  <span>estimated cost</span>
                  <span className="font-mono text-foreground-secondary">
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
                  "mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all",
                  outcome === "yes"
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] disabled:from-emerald-600/30 disabled:to-emerald-500/30 disabled:text-emerald-400/50"
                    : "bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-[0_0_20px_rgba(248,113,113,0.2)] disabled:from-red-600/30 disabled:to-red-500/30 disabled:text-red-400/50",
                )}
              >
                {createOrder.isPending ? (
                  <Spinner size="sm" className="mx-auto" />
                ) : (
                  `buy ${outcome} @ ${(priceNum * 100).toFixed(0)}\u00a2`
                )}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
