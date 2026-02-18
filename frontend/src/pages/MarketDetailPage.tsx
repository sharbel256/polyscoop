import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMarket, useOrderbook } from "@/hooks/useMarkets";
import { useTrades } from "@/hooks/useTrades";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { MarketHeader } from "@/components/market/MarketHeader";
import { TokenTabs } from "@/components/market/TokenTabs";
import { PriceChart } from "@/components/market/PriceChart";
import { DepthChart } from "@/components/market/DepthChart";
import { OrderbookPanel } from "@/components/market/OrderbookPanel";
import { TradeTape } from "@/components/market/TradeTape";
import { ActiveWallets } from "@/components/market/ActiveWallets";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

export function MarketDetailPage() {
  const { conditionId } = useParams<{ conditionId: string }>();
  const { data: market, isLoading, error } = useMarket(conditionId);

  // Default to first token (usually "Yes")
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>();
  const activeTokenId = selectedTokenId ?? market?.tokens[0]?.token_id;

  const { data: orderbook } = useOrderbook(activeTokenId);
  const { data: tradesData } = useTrades(conditionId);
  const { data: priceData } = usePriceHistory(activeTokenId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="card flex items-center gap-3 border-red-900/50 bg-red-950/30 text-red-400">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-medium">failed to load market</p>
          <p className="mt-0.5 text-sm text-red-400/70">
            {error instanceof Error ? error.message : "market not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="btn-ghost inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to markets
      </Link>

      <MarketHeader market={market} />

      {/* Token selector */}
      {market.tokens.length > 1 && (
        <TokenTabs
          tokens={market.tokens}
          selectedTokenId={activeTokenId}
          onSelect={setSelectedTokenId}
        />
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {priceData && <PriceChart history={priceData.history} />}
          {orderbook && <DepthChart orderbook={orderbook} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {orderbook && <OrderbookPanel orderbook={orderbook} />}
          {tradesData && <TradeTape trades={tradesData.trades} />}
          {tradesData && <ActiveWallets trades={tradesData.trades} />}
        </div>
      </div>
    </div>
  );
}
