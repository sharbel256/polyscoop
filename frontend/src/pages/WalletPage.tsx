import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useWalletPositions } from "@/hooks/useWalletPositions";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useWalletTrades } from "@/hooks/useWalletTrades";
import { useClosedPositions } from "@/hooks/useClosedPositions";
import { Tabs, Skeleton } from "@/components/ui";
import { WalletHeader } from "@/components/wallet/WalletHeader";
import { WalletStats } from "@/components/wallet/WalletStats";
import { TraderAnalytics } from "@/components/wallet/TraderAnalytics";
import { PositionsTable } from "@/components/wallet/PositionsTable";
import { ClosedPositionsTable } from "@/components/wallet/ClosedPositionsTable";
import { TradesTable } from "@/components/wallet/TradesTable";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { ArrowLeft, Copy } from "lucide-react";

type Tab = "positions" | "closed" | "trades";

export function WalletPage() {
  const { address } = useParams<{ address: string }>();
  const [tab, setTab] = useState<Tab>("positions");
  const [tradesPage, setTradesPage] = useState(0);
  const [closedPage, setClosedPage] = useState(0);
  const [closedSortBy, setClosedSortBy] = useState<"TIMESTAMP" | "REALIZEDPNL" | "AVGPRICE">("TIMESTAMP");
  const [closedSortDir, setClosedSortDir] = useState<"ASC" | "DESC">("DESC");

  const { data: positions, isLoading: positionsLoading } =
    useWalletPositions(address);
  const { data: profile, isLoading: profileLoading } =
    useWalletProfile(address);
  const { data: tradesData, isLoading: tradesLoading } = useWalletTrades(
    address,
    50,
    tradesPage * 50,
  );
  const { data: closedData, isLoading: closedLoading } = useClosedPositions(
    address,
    50,
    closedPage * 50,
    closedSortBy,
    closedSortDir,
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
      {profileLoading ? (
        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </motion.div>
      ) : profile ? (
        <motion.div variants={staggerItem}>
          <WalletStats
            liveStats={profile.live_stats}
            volume7d={score7d?.volume}
            rank7d={score7d?.rank_volume}
          />
        </motion.div>
      ) : null}

      {/* Trader Analytics */}
      {profileLoading ? (
        <motion.div variants={staggerItem}>
          <div className="card space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-surface-elevated/40 p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : profile?.trader_profile ? (
        <motion.div variants={staggerItem}>
          <TraderAnalytics tp={profile.trader_profile} score7d={score7d} />
        </motion.div>
      ) : null}

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
            { value: "closed" as Tab, label: "closed positions" },
            { value: "trades" as Tab, label: "live trades" },
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

        {tab === "closed" && (
          <ClosedPositionsTable
            positions={closedData?.positions}
            hasMore={closedData?.has_more ?? false}
            isLoading={closedLoading}
            page={closedPage}
            onPageChange={setClosedPage}
            sortBy={closedSortBy}
            sortDir={closedSortDir}
            onSortChange={(key, dir) => {
              setClosedSortBy(key);
              setClosedSortDir(dir);
              setClosedPage(0);
            }}
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
