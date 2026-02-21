import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Telescope, Search } from "lucide-react";

export function Header() {
  const navigate = useNavigate();
  const [walletSearch, setWalletSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleWalletSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walletSearch.trim();
    if (trimmed && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      navigate(`/wallet/${trimmed}`);
      setWalletSearch("");
      setShowSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface-dark-3 bg-surface-dark-0/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
            <Telescope className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            polyscoop
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="btn-ghost">
            dashboard
          </Link>
          <Link to="/leaderboard" className="btn-ghost">
            leaderboard
          </Link>
          <Link to="/feed" className="btn-ghost">
            feed
          </Link>
          <Link to="/copytrade" className="btn-ghost">
            copy
          </Link>
          <Link to="/portfolio" className="btn-ghost">
            portfolio
          </Link>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn-ghost"
            title="look up wallet"
          >
            <Search className="h-4 w-4" />
          </button>
        </nav>

        {/* Wallet search popup */}
        {showSearch && (
          <form
            onSubmit={handleWalletSearch}
            className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded-xl border border-surface-dark-3 bg-surface-dark-1 p-3 shadow-xl"
          >
            <input
              type="text"
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              placeholder="enter wallet address (0x...)"
              className="input w-80"
              autoFocus
            />
          </form>
        )}

        {/* Wallet */}
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus={{
            smallScreen: "avatar",
            largeScreen: "full",
          }}
        />
      </div>
    </header>
  );
}
