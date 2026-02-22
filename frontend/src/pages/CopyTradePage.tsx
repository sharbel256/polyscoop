import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import {
  useCopytradeConfigs,
  useCreateCopytradeConfig,
  useUpdateCopytradeConfig,
  useDeleteCopytradeConfig,
  useCopytradeHistory,
} from "@/hooks/useCopyTrade";
import { cn, formatUsd, shortenAddress } from "@/lib/utils";
import {
  Copy,
  Loader2,
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
      <div className="flex items-center justify-center py-20">
        <div className="card text-center">
          <Copy className="mx-auto h-8 w-8 text-gray-600" />
          <p className="mt-3 text-sm text-gray-400">
            connect your wallet to set up copy trading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Copy className="h-6 w-6 text-brand-500" />
            copy trading
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            follow top traders and mirror their positions
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          add target
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-dark-2 p-1 self-start w-fit">
        <button
          onClick={() => setTab("configs")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "configs"
              ? "bg-brand-700 text-white"
              : "text-gray-400 hover:text-white",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          targets
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "history"
              ? "bg-brand-700 text-white"
              : "text-gray-400 hover:text-white",
          )}
        >
          <History className="h-3.5 w-3.5" />
          history
        </button>
      </div>

      {/* Content */}
      {tab === "configs" && (
        <div className="space-y-3">
          {configsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : !configsData?.configs.length ? (
            <div className="card flex items-center justify-center py-16 text-gray-600">
              <div className="text-center">
                <Copy className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">
                  no copy-trade targets configured yet
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-secondary mt-4 text-xs"
                >
                  add your first target
                </button>
              </div>
            </div>
          ) : (
            configsData.configs.map((config) => (
              <div key={config.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-white">
                      {shortenAddress(config.target_wallet, 6)}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        fraction: {(config.fraction * 100).toFixed(0)}%
                      </span>
                      <span>max: {formatUsd(config.max_position_usd)}</span>
                      <span>
                        daily limit: {formatUsd(config.daily_limit_usd)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                          : "bg-surface-dark-2 text-gray-500 hover:text-gray-300",
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
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="card overflow-hidden p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : !historyData?.executions.length ? (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <div className="text-center">
                <History className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">no executions yet</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-surface-dark-3/50">
              {historyData.executions.map((exec) => {
                const isBuy = exec.side.toUpperCase() === "BUY";
                return (
                  <div
                    key={exec.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-300">
                        copying {shortenAddress(exec.target_wallet)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {exec.condition_id.slice(0, 16)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-gray-300">
                        {formatUsd(exec.copy_size * exec.target_price)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {exec.copy_size.toFixed(1)} shares
                      </p>
                    </div>
                    <span
                      className={cn(
                        "badge text-xs",
                        exec.status === "filled"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : exec.status === "failed" ||
                              exec.status === "skipped"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-yellow-500/10 text-yellow-400",
                      )}
                    >
                      {exec.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Target Modal */}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">add copy target</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">
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
            <label className="mb-1.5 block text-xs text-gray-500">
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
              <label className="mb-1.5 block text-xs text-gray-500">
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
              <label className="mb-1.5 block text-xs text-gray-500">
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
      </div>
    </div>
  );
}
