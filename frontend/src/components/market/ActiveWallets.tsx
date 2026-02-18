import { Link } from "react-router-dom";
import type { TradeRecord } from "@/lib/api";
import { shortenAddress } from "@/lib/utils";
import { Users } from "lucide-react";

interface ActiveWalletsProps {
  trades: TradeRecord[];
}

export function ActiveWallets({ trades }: ActiveWalletsProps) {
  const counts = new Map<string, number>();
  for (const t of trades) {
    if (t.wallet) {
      counts.set(t.wallet, (counts.get(t.wallet) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-300">active wallets</h3>
      </div>

      <div className="space-y-1">
        {sorted.map(([address, count]) => (
          <div
            key={address}
            className="flex items-center justify-between rounded bg-surface-dark-2 px-2 py-1.5 text-xs"
          >
            <Link
              to={`/wallet/${address}`}
              className="font-mono text-brand-400 hover:text-brand-300"
            >
              {shortenAddress(address)}
            </Link>
            <span className="font-mono text-gray-500">{count} trades</span>
          </div>
        ))}
      </div>
    </div>
  );
}
