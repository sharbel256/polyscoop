import { useAccount } from "wagmi";
import { WalletInfo } from "@/components/WalletInfo";
import { SessionPanel } from "@/components/SessionPanel";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Briefcase } from "lucide-react";

export function PortfolioPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="mb-4 h-12 w-12 text-gray-600" />
        <h2 className="text-xl font-bold text-white">Connect your wallet</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Link your wallet to view your Polymarket positions, open orders, and
          trade history.
        </p>
        <div className="mt-6">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main content */}
      <div className="space-y-6">
        {/* Positions placeholder */}
        <div className="card">
          <h2 className="text-lg font-bold text-white">Positions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your active prediction market positions will appear here.
          </p>
          <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-surface-dark-3 py-16 text-gray-600">
            <div className="text-center">
              <Briefcase className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">No positions yet</p>
              <p className="mt-1 text-xs text-gray-700">
                Initialize your trading session and place orders to get started
              </p>
            </div>
          </div>
        </div>

        {/* Orders placeholder */}
        <div className="card">
          <h2 className="text-lg font-bold text-white">Open Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your pending limit orders will appear here.
          </p>
          <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-surface-dark-3 py-12 text-gray-600">
            <p className="text-sm">No open orders</p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <WalletInfo />
        <SessionPanel />
      </aside>
    </div>
  );
}
