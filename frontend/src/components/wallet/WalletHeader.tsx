import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn, shortenAddress } from "@/lib/utils";
import { WalletAvatar } from "@/components/WalletAvatar";
import { Card } from "@/components/ui";
import { slideUp } from "@/lib/motion";
import { Search, Copy, Check, ExternalLink } from "lucide-react";

interface WalletHeaderProps {
  address: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
}

export function WalletHeader({
  address,
  displayName,
  profileImageUrl,
}: WalletHeaderProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      navigate(`/wallet/${trimmed}`);
      setSearchInput("");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible">
      <Card accent>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-foreground-muted">wallet inspector</p>
            <div className="mt-1 flex items-center gap-2">
              <WalletAvatar
                address={address}
                imageUrl={profileImageUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h1
                  className={cn(
                    "truncate text-base font-bold text-foreground sm:text-lg",
                    !displayName && "font-mono",
                  )}
                >
                  {displayName
                    ? displayName.toLowerCase()
                    : shortenAddress(address, 6)}
                </h1>
                {displayName && (
                  <p className="font-mono text-xs text-foreground-muted">
                    {shortenAddress(address, 6)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-elevated/60 hover:text-foreground-secondary"
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
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-elevated/60 hover:text-foreground-secondary"
                  title="view on polygonscan"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="look up address..."
                className="input w-full pl-9 sm:max-w-[300px]"
              />
            </div>
            <button type="submit" className="btn-secondary shrink-0 text-xs">
              search
            </button>
          </form>
        </div>
      </Card>
    </motion.div>
  );
}
