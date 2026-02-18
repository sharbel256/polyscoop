import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWalletPositions } from "@/hooks/useWalletPositions";
import { cn, formatUsd, shortenAddress } from "@/lib/utils";
import {
  Loader2,
  Search,
  Copy,
  Check,
  ExternalLink,
  Briefcase,
  ArrowLeft,
} from "lucide-react";

export function WalletPage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: positions, isLoading } = useWalletPositions(address);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      navigate(`/wallet/${trimmed}`);
      setSearchInput("");
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

      {/* Header */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-gray-500">wallet inspector</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold text-white">
                {address ? shortenAddress(address, 6) : "—"}
              </h1>
              {address && (
                <>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-dark-2 hover:text-gray-300"
                    title="copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={`https://polygonscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-surface-dark-2 hover:text-gray-300"
                    title="view on polygonscan"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Search for different address */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="look up address..."
                className="input pl-9"
                style={{ maxWidth: "300px" }}
              />
            </div>
            <button type="submit" className="btn-secondary text-xs">
              search
            </button>
          </form>
        </div>
      </div>

      {/* Positions */}
      <div className="card">
        <h2 className="text-lg font-bold text-white">positions</h2>
        <p className="mt-1 text-sm text-gray-500">
          this wallet's prediction market positions
        </p>

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : !positions || positions.length === 0 ? (
          <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-surface-dark-3 py-16 text-gray-600">
            <div className="text-center">
              <Briefcase className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">no positions found</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {positions.map((pos) => {
              const isPnlPositive = pos.cashPnl >= 0;
              return (
                <div
                  key={pos.asset}
                  className="rounded-xl border border-surface-dark-3 bg-surface-dark-2 p-4"
                >
                  <div className="flex items-start gap-3">
                    {pos.icon && (
                      <img
                        src={pos.icon}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/market/${pos.conditionId}`}
                        className="text-sm font-medium leading-snug text-gray-200 hover:text-white"
                      >
                        {pos.title}
                      </Link>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                          pos.outcome === "Yes"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400",
                        )}
                      >
                        {pos.outcome.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>shares</span>
                      <span className="font-mono text-gray-300">
                        {pos.size.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>current price</span>
                      <span className="font-mono text-gray-300">
                        {(pos.curPrice * 100).toFixed(1)}¢
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>value</span>
                      <span className="font-mono text-gray-300">
                        {formatUsd(pos.currentValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>p&l</span>
                      <span
                        className={cn(
                          "font-mono",
                          isPnlPositive ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {isPnlPositive ? "+" : ""}
                        {formatUsd(pos.cashPnl)} ({isPnlPositive ? "+" : ""}
                        {pos.percentPnl.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
