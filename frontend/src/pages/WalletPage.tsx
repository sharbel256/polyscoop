import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useWalletPositions } from "@/hooks/useWalletPositions";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useWalletTrades } from "@/hooks/useWalletTrades";
import { Tabs } from "@/components/ui";
import { WalletHeader } from "@/components/wallet/WalletHeader";
import { WalletStats } from "@/components/wallet/WalletStats";
import { TraderAnalytics } from "@/components/wallet/TraderAnalytics";
import { PositionsTable } from "@/components/wallet/PositionsTable";
import { TradesTable } from "@/components/wallet/TradesTable";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { ArrowLeft, Copy } from "lucide-react";

type Tab = "positions" | "trades";

export function WalletPage() {
  const { address } = useParams<{ address: string }>();
  const [tab, setTab] = useState<Tab>("positions");
  const [tradesPage, setTradesPage] = useState(0);

  const { data: positions, isLoading: positionsLoading } =
    useWalletPositions(address);
  const { data: profile, isLoading: profileLoading } =
    useWalletProfile(address);
  const { data: tradesData, isLoading: tradesLoading } = useWalletTrades(
    address,
    50,
    tradesPage * 50,
  );

  const score7d = profile?.scores?.["7d"];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Back link */}
      <motion.div variants={staggerItem}>
        <Link
          to="/"
          className="btn-ghost inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          back to dashboard
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={staggerItem}>
        {address && (
          <WalletHeader
            address={address}
            displayName={profile?.display_name}
            profileImageUrl={profile?.profile_image_url}
          />
        )}
      </motion.div>

      {/* Stats */}
      {!profileLoading && profile && (
        <motion.div variants={staggerItem}>
          <WalletStats
            totalVolume={profile.total_volume}
            totalTrades={profile.total_trades}
            volume7d={score7d?.volume}
            rank7d={score7d?.rank_volume}
          />
        </motion.div>
      )}

      {/* Trader Analytics */}
      {!profileLoading && profile?.trader_profile && (
        <motion.div variants={staggerItem}>
          <TraderAnalytics tp={profile.trader_profile} score7d={score7d} />
        </motion.div>
      )}

      {/* Copy wallet button */}
      {address && (
        <motion.div variants={staggerItem}>
          <Link
            to={`/copytrade?target=${address}`}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Copy className="h-4 w-4" />
            copy this wallet
          </Link>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={staggerItem}>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "positions" as Tab, label: "positions" },
            { value: "trades" as Tab, label: "trade history" },
          ]}
          layoutId="wallet-tabs"
        />
      </motion.div>

      {/* Tab content */}
      <motion.div variants={staggerItem}>
        {tab === "positions" && (
          <PositionsTable
            positions={positions}
            isLoading={positionsLoading}
          />
        )}

        {tab === "trades" && (
          <TradesTable
            trades={tradesData?.trades}
            total={tradesData?.total ?? 0}
            isLoading={tradesLoading}
            address={address!}
            tradesPage={tradesPage}
            onPageChange={setTradesPage}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
