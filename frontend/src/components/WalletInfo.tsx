import { useWallet } from "@/hooks/useWallet";
import useSafeDeployment from "@/hooks/useSafeDeployment";
import { useCashBalance } from "@/hooks/useCashBalance";
import { usePositions } from "@/hooks/usePositions";
import { formatUsd, shortenAddress } from "@/lib/utils";
import { Wallet, ExternalLink } from "lucide-react";

export function WalletInfo() {
  const { eoaAddress, isConnected } = useWallet();
  const { derivedSafeAddressFromEoa } = useSafeDeployment();

  // Positions API accepts EOA directly; cash balance must use the Safe address
  const { totalPositionsValue, isLoading: posLoading } = usePositions(
    eoaAddress ?? undefined,
  );
  const { formattedCashBalance, isLoading: cashLoading } = useCashBalance(
    derivedSafeAddressFromEoa ?? undefined,
  );

  if (!isConnected || !eoaAddress) return null;

  const cashNum = parseFloat(formattedCashBalance);
  const portfolioTotal = totalPositionsValue + cashNum;
  const isLoading = cashLoading || posLoading;

  return (
    <div className="card">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
          <Wallet className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground-secondary">
            {shortenAddress(eoaAddress)}
          </p>
          <a
            href={`https://polygonscan.com/address/${eoaAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-foreground-muted hover:text-brand-400"
          >
            view on polygonscan
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
          <span className="text-xs text-foreground-muted">portfolio total</span>
          <span className="font-mono text-sm font-medium text-gain">
            {isLoading ? "–" : formatUsd(portfolioTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
          <span className="text-xs text-foreground-muted">positions value</span>
          <span className="font-mono text-sm font-medium text-foreground-secondary">
            {posLoading ? "–" : formatUsd(totalPositionsValue)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
          <span className="text-xs text-foreground-muted">cash balance</span>
          <span className="font-mono text-sm font-medium text-foreground-secondary">
            {cashLoading ? "–" : `$${formattedCashBalance}`}
          </span>
        </div>
      </div>
    </div>
  );
}
