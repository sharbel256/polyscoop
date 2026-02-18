import { Telescope, Fish, Eye, ArrowLeftRight } from "lucide-react";

export function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark-0">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700">
            <Telescope className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            polyscoop
          </span>
        </div>

        {/* Tagline */}
        <h1 className="mt-8 max-w-lg text-center text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          market intelligence for prediction markets
        </h1>
        <p className="mt-4 max-w-md text-center text-gray-400">
          surface anomalies across polymarket — all in real time.
        </p>

        {/* Feature highlights */}
        <div className="mt-12 grid max-w-lg gap-4 sm:grid-cols-3">
          {[
            {
              icon: Fish,
              label: "whale watch",
              desc: "track large wallets & copy their moves",
            },
            {
              icon: Eye,
              label: "insider scoop",
              desc: "detect informed trading probability",
            },
            {
              icon: ArrowLeftRight,
              label: "arbitrage",
              desc: "spot mispriced opportunities across markets",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-surface-dark-3 bg-surface-dark-1 p-4 text-center"
            >
              <Icon className="mx-auto h-5 w-5 text-brand-400" />
              <p className="mt-2 text-sm font-semibold text-gray-200">
                {label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Coming soon badge */}
        <div className="mt-12 rounded-full border border-brand-700/40 bg-brand-900/20 px-5 py-2 text-sm font-medium text-brand-400">
          coming soon
        </div>
      </div>

      {/* Minimal footer */}
      <footer className="border-t border-surface-dark-3 py-6 text-center text-xs text-gray-600">
        polyscoop — powered by polymarket
      </footer>
    </div>
  );
}
