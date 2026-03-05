import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Telescope } from "lucide-react";

export function Header() {
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
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-2">
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
