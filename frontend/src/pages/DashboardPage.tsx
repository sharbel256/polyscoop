import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { WalletInfo } from "@/components/WalletInfo";
import { SessionPanel } from "@/components/SessionPanel";
import {
  formatUsd,
  formatCompact,
  shortenAddress,
  timeAgo,
  cn,
} from "@/lib/utils";
import { WalletAvatar } from "@/components/WalletAvatar";
import {
  Card,
  Spinner,
  AnimatedNumber,
  GradientBackground,
} from "@/components/ui";
import {
  staggerContainer,
  staggerItem,
  cardHover,
  tableRowVariant,
} from "@/lib/motion";
import {
  Telescope,
  Users,
  BarChart3,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

function HeroSection() {
  return (
    <motion.div
      variants={staggerItem}
      className="relative overflow-hidden rounded-xl sm:rounded-2xl"
    >
      <div className="card gradient-border relative">
        <GradientBackground variant="hero" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-400">
            <Telescope className="h-5 w-5" />
            <span className="gradient-text text-sm font-semibold uppercase tracking-wider">
              polyscoop
            </span>
          </div>
          <h1 className="mt-3 text-h1 tracking-tight text-foreground">
            discover top traders
            <br />
            on polymarket
          </h1>
          <p className="mt-3 max-w-lg text-sm text-foreground-secondary sm:text-base">
            connect your wallet to explore trader analytics, follow live trades,
            and copy winning strategies.
          </p>

          <div className="mt-6">
            <ConnectButton />
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-1 sm:mt-8 sm:flex-wrap">
            {[
              { icon: Users, label: "wallet analytics" },
              { icon: TrendingUp, label: "copy trading" },
              { icon: BarChart3, label: "leaderboard" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="glass-subtle flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground-secondary"
              >
                <Icon className="h-3.5 w-3.5 text-brand-400" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const gradients: Record<number, string> = {
    1: "from-accent-cyan to-brand-500",
    2: "from-brand-500 to-accent-purple",
    3: "from-accent-purple to-accent-pink",
  };
  const gradient = gradients[rank];
  if (!gradient) {
    return <span className="font-mono text-foreground-muted">{rank}</span>;
  }
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r ${gradient} text-xs font-bold text-white`}
    >
      {rank}
    </span>
  );
}

export function DashboardPage() {
  const { isConnected } = useAccount();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(
    "roi",
    "desc",
    "7d",
    10,
    0,
  );

  const totalTraders = leaderboard?.total ?? 0;
  const totalVolume =
    leaderboard?.wallets.reduce((sum, w) => sum + w.volume, 0) ?? 0;
  const totalTrades =
    leaderboard?.wallets.reduce((sum, w) => sum + w.trade_count, 0) ?? 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      <HeroSection />

      {isConnected ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="order-2 space-y-4 sm:space-y-6 lg:order-1"
          >
            {/* Stat cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-2 sm:gap-3"
            >
              {[
                {
                  icon: Users,
                  label: "traders tracked",
                  value: totalTraders,
                  format: formatCompact,
                },
                {
                  icon: BarChart3,
                  label: "7d volume",
                  value: totalVolume,
                  format: formatUsd,
                },
                {
                  icon: TrendingUp,
                  label: "7d trades",
                  value: totalTrades,
                  format: formatCompact,
                },
              ].map(({ icon: Icon, label, value, format }) => (
                <motion.div key={label} variants={staggerItem}>
                  <motion.div
                    variants={cardHover}
                    initial="rest"
                    whileHover="hover"
                  >
                    <Card>
                      <div className="flex items-center gap-2 text-xs text-foreground-muted">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </div>
                      {lbLoading ? (
                        <p className="mt-1 font-mono text-base font-bold text-foreground sm:text-lg">
                          —
                        </p>
                      ) : (
                        <AnimatedNumber
                          value={value}
                          format={format}
                          className="mt-1 block font-mono text-base font-bold text-foreground sm:text-lg"
                        />
                      )}
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>

            {/* Leaderboard preview */}
            <motion.div variants={staggerItem}>
              <Card noPadding className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3 sm:px-4">
                  <h2 className="text-sm font-bold text-foreground">
                    top traders by roi (7d)
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
                    <Spinner />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.04] text-foreground-muted">
                          <th className="px-2 py-2 text-left font-medium sm:px-4">
                            #
                          </th>
                          <th className="px-2 py-2 text-left font-medium sm:px-4">
                            wallet
                          </th>
                          <th className="px-2 py-2 text-right font-medium sm:px-4">
                            roi
                          </th>
                          <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                            trades
                          </th>
                          <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">
                            last active
                          </th>
                        </tr>
                      </thead>
                      <motion.tbody
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-white/[0.03]"
                      >
                        {leaderboard?.wallets.map((w, i) => (
                          <motion.tr
                            key={w.address}
                            variants={tableRowVariant}
                            className="transition-colors hover:bg-surface-elevated/30 hover:border-l-2 hover:border-l-brand-500/50"
                          >
                            <td className="px-2 py-2 sm:px-4">
                              <RankBadge rank={i + 1} />
                            </td>
                            <td className="px-2 py-2 sm:px-4">
                              <Link
                                to={`/wallet/${w.address}`}
                                className="flex items-center gap-2 hover:opacity-80"
                              >
                                <WalletAvatar
                                  address={w.address}
                                  imageUrl={w.profile_image_url}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  {w.display_name ? (
                                    <span className="truncate text-foreground-secondary">
                                      {w.display_name.toLowerCase()}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-brand-400">
                                      {shortenAddress(w.address)}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </td>
                            <td
                              className={cn(
                                "px-2 py-2 text-right font-mono sm:px-4",
                                w.roi >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400",
                              )}
                            >
                              {w.roi >= 0 ? "+" : ""}
                              {(w.roi * 100).toFixed(1)}%
                            </td>
                            <td className="hidden px-4 py-2 text-right font-mono text-foreground-secondary sm:table-cell">
                              {formatCompact(w.trade_count)}
                            </td>
                            <td className="hidden px-4 py-2 text-right text-foreground-muted sm:table-cell">
                              {w.last_trade_at ? timeAgo(w.last_trade_at) : "—"}
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>

          {/* Sidebar — stacks on top on mobile, right column on desktop */}
          <aside className="order-1 space-y-4 lg:order-2">
            <WalletInfo />
            <SessionPanel />
          </aside>
        </div>
      ) : (
        <motion.div variants={staggerItem} className="py-12 text-center">
          <p className="text-foreground-muted">
            connect your wallet above to explore trader analytics.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
