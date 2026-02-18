import { useAccount } from "wagmi";
import { WalletInfo } from "@/components/WalletInfo";
import { SessionPanel } from "@/components/SessionPanel";
import { PositionsList } from "@/components/trading/PositionsList";
import { OpenOrdersList } from "@/components/trading/OpenOrdersList";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Briefcase } from "lucide-react";
import { useTradingSession } from "@/hooks/useTradingSession";
import useClobClient from "@/hooks/useClobClient";
import { usePositions } from "@/hooks/usePositions";
import { useOpenOrders } from "@/hooks/useOpenOrders";

export function PortfolioPage() {
  const { isConnected } = useAccount();
  const { tradingSession, isTradingSessionComplete } = useTradingSession();
  const { clobClient } = useClobClient(
    tradingSession,
    isTradingSessionComplete,
  );
  const { positions, isLoading: positionsLoading } = usePositions(
    tradingSession?.safeAddress,
  );
  const { data: openOrders, isLoading: ordersLoading } = useOpenOrders(
    clobClient,
    tradingSession?.safeAddress,
  );

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="mb-4 h-12 w-12 text-gray-600" />
        <h2 className="text-xl font-bold text-white">connect your wallet</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          link your wallet to view your polymarket positions, open orders, and
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
        <PositionsList
          positions={positions}
          isLoading={positionsLoading}
          clobClient={clobClient}
        />
        <OpenOrdersList
          orders={openOrders ?? []}
          isLoading={ordersLoading}
          clobClient={clobClient}
        />
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <WalletInfo />
        <SessionPanel />
      </aside>
    </div>
  );
}
