import { cn } from "@/lib/utils";
import type { MarketToken } from "@/lib/api";

interface TokenTabsProps {
  tokens: MarketToken[];
  selectedTokenId: string | undefined;
  onSelect: (tokenId: string) => void;
}

export function TokenTabs({
  tokens,
  selectedTokenId,
  onSelect,
}: TokenTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-1">
      {tokens.map((token) => (
        <button
          key={token.token_id}
          onClick={() => onSelect(token.token_id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            selectedTokenId === token.token_id
              ? token.outcome === "Yes"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
              : "text-gray-400 hover:text-gray-200",
          )}
        >
          {token.outcome.toLowerCase()}
          {token.price != null && (
            <span className="ml-1.5 font-mono text-xs opacity-80">
              {(token.price * 100).toFixed(1)}¢
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
