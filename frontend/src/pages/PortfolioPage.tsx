import { useAccount } from "wagmi";
import { motion } from "framer-motion";
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
import { GradientBackground } from "@/components/ui";
import { slideUp, staggerContainer, staggerItem } from "@/lib/motion";

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
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="relative flex flex-col items-center justify-center py-24 text-center"
      >
        <GradientBackground variant="hero" />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
            <Briefcase className="h-8 w-8 text-foreground-muted" />
          </div>
          <h2 className="mt-4 text-h2 text-foreground">connect your wallet</h2>
          <p className="mt-2 max-w-md text-sm text-foreground-muted">
            link your wallet to view your polymarket positions, open orders, and
            trade history.
          </p>
          <div className="mt-6">
            <ConnectButton />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
    >
      {/* Main content */}
      <div className="order-2 space-y-6 lg:order-1">
        <motion.div variants={staggerItem}>
          <PositionsList
            positions={positions}
            isLoading={positionsLoading}
            clobClient={clobClient}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <OpenOrdersList
            orders={openOrders ?? []}
            isLoading={ordersLoading}
            clobClient={clobClient}
          />
        </motion.div>
      </div>

      {/* Sidebar — stacks on top on mobile, right column on desktop */}
      <aside className="order-1 space-y-4 lg:order-2">
        <WalletInfo />
        <SessionPanel />
      </aside>
    </motion.div>
  );
}
