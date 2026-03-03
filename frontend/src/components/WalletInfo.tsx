import { useWallet } from "@/hooks/useWallet";
import { useTradingSession } from "@/hooks/useTradingSession";
import { useCashBalance } from "@/hooks/useCashBalance";
import { usePositions } from "@/hooks/usePositions";
import { useBalance } from "wagmi";
import { polygon } from "wagmi/chains";
import { shortenAddress } from "@/lib/utils";
import { Wallet, ExternalLink } from "lucide-react";

export function WalletInfo() {
  const { eoaAddress, isConnected } = useWallet();
  const { tradingSession } = useTradingSession();
  const safeAddress = tradingSession?.safeAddress;
  const { formattedCashBalance } = useCashBalance(safeAddress);
  const { totalPositionsValue } = usePositions(safeAddress);

  const { data: maticBalance } = useBalance({
    address: eoaAddress,
    chainId: polygon.id,
    query: { enabled: !!eoaAddress },
  });

  const { data: usdcBalance } = useBalance({
    address: eoaAddress,
    chainId: polygon.id,
    token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    query: { enabled: !!eoaAddress },
  });

  if (!isConnected || !eoaAddress) return null;

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

      {safeAddress && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
            <span className="text-xs text-foreground-muted">cash balance</span>
            <span className="font-mono text-sm font-medium text-gain">
              ${formattedCashBalance}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
            <span className="text-xs text-foreground-muted">portfolio value</span>
            <span className="font-mono text-sm font-medium text-gain">
              $
              {(totalPositionsValue + parseFloat(formattedCashBalance)).toFixed(
                2,
              )}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
          <span className="text-xs text-foreground-muted">matic</span>
          <span className="font-mono text-sm font-medium text-foreground-secondary">
            {maticBalance ? parseFloat(maticBalance.formatted).toFixed(4) : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-elevated/40 px-3 py-2">
          <span className="text-xs text-foreground-muted">usdc.e</span>
          <span className="font-mono text-sm font-medium text-foreground-secondary">
            {usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : "–"}
          </span>
        </div>
      </div>
    </div>
  );
}
