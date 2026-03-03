import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCopytradeConfigs,
  useCreateCopytradeConfig,
  useUpdateCopytradeConfig,
  useDeleteCopytradeConfig,
  useCopytradeHistory,
} from "@/hooks/useCopyTrade";
import { cn, formatUsd, shortenAddress } from "@/lib/utils";
import { Card, Spinner, SideBadge, EmptyState, Tabs } from "@/components/ui";
import {
  staggerContainer,
  staggerItem,
  scaleIn,
  slideUp,
} from "@/lib/motion";
import {
  Copy,
  Plus,
  Power,
  Trash2,
  History,
  Settings,
  X,
} from "lucide-react";

type Tab = "configs" | "history";

export function CopyTradePage() {
  const { address } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("configs");
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialTarget, setInitialTarget] = useState<string | undefined>();

  useEffect(() => {
    const target = searchParams.get("target");
    if (target && /^0x[a-fA-F0-9]{40}$/.test(target)) {
      setInitialTarget(target);
      setShowAddModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: configsData, isLoading: configsLoading } =
    useCopytradeConfigs(address);
  const { data: historyData, isLoading: historyLoading } =
    useCopytradeHistory(address);
  const updateConfig = useUpdateCopytradeConfig();
  const deleteConfig = useDeleteCopytradeConfig();

  if (!address) {
    return (
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center py-20"
      >
        <Card className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
            <Copy className="h-6 w-6 text-foreground-muted" />
          </div>
          <p className="mt-3 text-sm text-foreground-secondary">
            connect your wallet to set up copy trading
          </p>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-h2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
              <Copy className="h-5 w-5 text-brand-400" />
            </div>
            copy trading
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            follow top traders and mirror their positions
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex shrink-0 items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">add target</span>
          <span className="sm:hidden">add</span>
        </button>
      </motion.div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "configs" as Tab, label: "targets", icon: <Settings className="h-3.5 w-3.5" /> },
          { value: "history" as Tab, label: "history", icon: <History className="h-3.5 w-3.5" /> },
        ]}
        layoutId="copytrade-tabs"
      />

      {/* Content */}
      {tab === "configs" && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {configsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : !configsData?.configs.length ? (
            <Card>
              <EmptyState
                icon={Copy}
                title="no copy-trade targets configured yet"
              />
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-secondary text-xs"
                >
                  add your first target
                </button>
              </div>
            </Card>
          ) : (
            configsData.configs.map((config) => (
              <motion.div key={config.id} variants={staggerItem}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-foreground">
                        {shortenAddress(config.target_wallet, 6)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
                        <span>
                          fraction: {(config.fraction * 100).toFixed(0)}%
                        </span>
                        <span>max: {formatUsd(config.max_position_usd)}</span>
                        <span>
                          daily limit: {formatUsd(config.daily_limit_usd)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() =>
                          updateConfig.mutate({
                            configId: config.id,
                            userAddress: address,
                            data: { enabled: !config.enabled },
                          })
                        }
                        className={cn(
                          "rounded-lg p-2 transition-colors",
                          config.enabled
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-surface-elevated/40 text-foreground-muted hover:text-foreground-secondary",
                        )}
                        title={config.enabled ? "disable" : "enable"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          deleteConfig.mutate({
                            configId: config.id,
                            userAddress: address,
                          })
                        }
                        className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-red-500/10 hover:text-red-400 hover:shadow-[0_0_12px_rgba(248,113,113,0.15)]"
                        title="delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {tab === "history" && (
        <Card noPadding className="overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : !historyData?.executions.length ? (
            <EmptyState icon={History} title="no executions yet" />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-white/[0.04]"
            >
              {historyData.executions.map((exec) => (
                <motion.div
                  key={exec.id}
                  variants={staggerItem}
                  className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4"
                >
                  <SideBadge side={exec.side} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground-secondary">
                      copying {shortenAddress(exec.target_wallet)}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {exec.condition_id.slice(0, 16)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-foreground-secondary">
                      {formatUsd(exec.copy_size * exec.target_price)}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {exec.copy_size.toFixed(1)} shares
                    </p>
                  </div>
                  <span
                    className={cn(
                      "badge text-xs",
                      exec.status === "filled"
                        ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                        : exec.status === "failed" || exec.status === "skipped"
                          ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                          : "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20",
                    )}
                  >
                    {exec.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </Card>
      )}

      {/* Add Target Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddTargetModal
            userAddress={address}
            initialTarget={initialTarget}
            onClose={() => {
              setShowAddModal(false);
              setInitialTarget(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddTargetModal({
  userAddress,
  initialTarget,
  onClose,
}: {
  userAddress: string;
  initialTarget?: string;
  onClose: () => void;
}) {
  const createConfig = useCreateCopytradeConfig();
  const [targetWallet, setTargetWallet] = useState(initialTarget ?? "");
  const [fraction, setFraction] = useState(50);
  const [maxPosition, setMaxPosition] = useState(100);
  const [dailyLimit, setDailyLimit] = useState(500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWallet || !/^0x[a-fA-F0-9]{40}$/.test(targetWallet)) return;

    createConfig.mutate(
      {
        user_address: userAddress,
        target_wallet: targetWallet,
        fraction: fraction / 100,
        max_position_usd: maxPosition,
        daily_limit_usd: dailyLimit,
        delay_seconds: 0,
        slippage_tolerance: 0.05,
        cooldown_seconds: 60,
        filters: {},
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

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
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-full max-w-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              add copy target
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-foreground-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-foreground-muted">
                target wallet address
              </label>
              <input
                type="text"
                value={targetWallet}
                onChange={(e) => setTargetWallet(e.target.value)}
                placeholder="0x..."
                className="input w-full font-mono"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-foreground-muted">
                copy fraction: {fraction}%
              </label>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={fraction}
                onChange={(e) => setFraction(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-foreground-muted">
                  max per trade ($)
                </label>
                <input
                  type="number"
                  value={maxPosition}
                  onChange={(e) => setMaxPosition(Number(e.target.value))}
                  className="input w-full"
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-foreground-muted">
                  daily limit ($)
                </label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="input w-full"
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={createConfig.isPending}
              >
                {createConfig.isPending ? "adding..." : "add target"}
              </button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
