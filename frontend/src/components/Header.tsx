import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Telescope } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-dark-3 bg-surface-dark-0/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
            <Telescope className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            polyscoop
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <a href="/" className="btn-ghost">
            Markets
          </a>
          <a href="/portfolio" className="btn-ghost">
            Portfolio
          </a>
        </nav>

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
