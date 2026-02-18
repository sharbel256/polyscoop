import { useAccount } from "wagmi";
import { MarketGrid } from "@/components/MarketGrid";
import { WalletInfo } from "@/components/WalletInfo";
import { SessionPanel } from "@/components/SessionPanel";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Telescope, Zap, Shield, BarChart3 } from "lucide-react";

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-dark-3 bg-gradient-to-br from-brand-900/40 via-surface-dark-1 to-surface-dark-1 p-8 sm:p-12">
      {/* Background decoration */}
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
          your lens into
          <br />
          prediction markets
        </h1>
        <p className="mt-3 max-w-lg text-gray-400">
          connect your wallet to explore polymarket data, track positions, and
          trade with builder attribution — all in one place.
        </p>

        <div className="mt-6">
          <ConnectButton />
        </div>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { icon: Zap, label: "gasless trading" },
            { icon: Shield, label: "safe wallet" },
            { icon: BarChart3, label: "real-time data" },
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

export function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-8">
      <HeroSection />

      {isConnected && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <MarketGrid />
          <aside className="space-y-4">
            <WalletInfo />
            <SessionPanel />
          </aside>
        </div>
      )}

      {!isConnected && (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            connect your wallet above to browse markets and start trading.
          </p>
        </div>
      )}
    </div>
  );
}
