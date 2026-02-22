import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { fetchFeedTrades } from "@/lib/api";
import { WalletInfo } from "@/components/WalletInfo";
import { SessionPanel } from "@/components/SessionPanel";
import { formatUsd, formatCompact, shortenAddress, cn } from "@/lib/utils";
import {
  Telescope,
  Users,
  Activity,
  BarChart3,
  ArrowRight,
  Loader2,
  TrendingUp,
} from "lucide-react";

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-dark-3 bg-gradient-to-br from-brand-900/40 via-surface-dark-1 to-surface-dark-1 p-8 sm:p-12">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-700/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-500/5 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-brand-400">
          <Telescope className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            polyscoop
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          discover top traders
          <br />
          on polymarket
        </h1>
        <p className="mt-3 max-w-lg text-gray-400">
          connect your wallet to explore trader analytics, follow live trades,
          and copy winning strategies.
        </p>

        <div className="mt-6">
          <ConnectButton />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { icon: Users, label: "wallet analytics" },
            { icon: Activity, label: "live trade feed" },
            { icon: TrendingUp, label: "copy trading" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-surface-dark-3 bg-surface-dark-2/60 px-3 py-1.5 text-xs text-gray-400"
            >
              <Icon className="h-3.5 w-3.5 text-brand-400" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { isConnected } = useAccount();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(
    "volume",
    "desc",
    "7d",
    10,
    0,
  );
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["feed-preview"],
    queryFn: () => fetchFeedTrades(10),
    refetchInterval: 30_000,
  });

  const totalTraders = leaderboard?.total ?? 0;
  const totalVolume =
    leaderboard?.wallets.reduce((sum, w) => sum + w.volume, 0) ?? 0;
  const totalTrades =
    leaderboard?.wallets.reduce((sum, w) => sum + w.trade_count, 0) ?? 0;

  return (
    <div className="space-y-8">
      <HeroSection />

      {isConnected ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  traders tracked
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  {lbLoading ? "—" : formatCompact(totalTraders)}
                </p>
              </div>
              <div className="card">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  7d volume
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  {lbLoading ? "—" : formatUsd(totalVolume)}
                </p>
              </div>
              <div className="card">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Activity className="h-3.5 w-3.5" />
                  7d trades
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  {lbLoading ? "—" : formatCompact(totalTrades)}
                </p>
              </div>
            </div>

            {/* Leaderboard preview */}
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-surface-dark-3 px-4 py-3">
                <h2 className="text-sm font-bold text-white">
                  top traders (7d)
                </h2>
                <Link
                  to="/leaderboard"
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  view all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {lbLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-dark-3/50 text-gray-500">
                      <th className="px-4 py-2 text-left font-medium">#</th>
                      <th className="px-4 py-2 text-left font-medium">
                        wallet
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        volume
                      </th>
                      <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                        trades
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-dark-3/30">
                    {leaderboard?.wallets.map((w, i) => (
                      <tr
                        key={w.address}
                        className="transition-colors hover:bg-surface-dark-2/50"
                      >
                        <td className="px-4 py-2 font-mono text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2">
                          <Link
                            to={`/wallet/${w.address}`}
                            className="font-mono text-brand-400 hover:text-brand-300"
                          >
                            {shortenAddress(w.address)}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-300">
                          {formatUsd(w.volume)}
                        </td>
                        <td className="hidden px-4 py-2 text-right font-mono text-gray-400 sm:table-cell">
                          {formatCompact(w.trade_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Live feed preview */}
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-surface-dark-3 px-4 py-3">
                <h2 className="text-sm font-bold text-white">live trades</h2>
                <Link
                  to="/feed"
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  view all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {feedLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                </div>
              ) : !feedData?.trades.length ? (
                <div className="flex items-center justify-center py-12 text-gray-600">
                  <p className="text-sm">no recent trades</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-dark-3/30">
                  {feedData.trades.map((t) => {
                    const isBuy = t.side.toUpperCase() === "BUY";
                    const time = new Date(t.timestamp * 1000);
                    return (
                      <div
                        key={t.transaction_hash}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs"
                      >
                        <span className="w-14 shrink-0 font-mono text-gray-600">
                          {time.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span
                          className={cn(
                            "w-9 shrink-0 rounded-md px-1.5 py-0.5 text-center font-bold",
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {isBuy ? "buy" : "sell"}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-gray-300">
                          {t.title}
                        </p>
                        <Link
                          to={`/wallet/${t.wallet}`}
                          className="shrink-0 font-mono text-brand-400 hover:text-brand-300"
                        >
                          {shortenAddress(t.wallet)}
                        </Link>
                        <span className="w-16 shrink-0 text-right font-mono text-gray-400">
                          {formatUsd(t.size * t.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <WalletInfo />
            <SessionPanel />
          </aside>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            connect your wallet above to explore trader analytics.
          </p>
        </div>
      )}
    </div>
  );
}
