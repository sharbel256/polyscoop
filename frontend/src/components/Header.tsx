import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { scaleIn } from "@/lib/motion";

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
    <header className="sticky top-0 z-50 bg-surface/60 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Telescope className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            polyscoop
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { to: "/", label: "dashboard" },
            { to: "/leaderboard", label: "leaderboard" },
            { to: "/copytrade", label: "copy" },
            { to: "/portfolio", label: "portfolio" },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="group relative px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
            >
              {label}
              <span className="absolute inset-x-2 -bottom-px h-px scale-x-0 bg-gradient-to-r from-brand-500/50 to-accent-purple/50 transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn-ghost"
            title="look up wallet"
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </nav>

        {/* Wallet search popup (desktop only) */}
        <AnimatePresence>
          {showSearch && (
            <motion.form
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              onSubmit={handleWalletSearch}
              className="glass absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 rounded-xl p-3 shadow-xl md:block"
            >
              <input
                type="text"
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                placeholder="enter wallet address (0x...)"
                className="input w-80"
                autoFocus
              />
            </motion.form>
          )}
        </AnimatePresence>

        {/* Wallet + Theme toggle (mobile) */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="md:hidden">
            <ThemeToggle />
          </div>
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
          />
        </div>
      </div>

      {/* Gradient bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
    </header>
  );
}
