import { Link } from "react-router-dom";
import { useBuilderTrades } from "@/hooks/useBuilderTrades";
import { shortenAddress, cn } from "@/lib/utils";
import {
  Shield,
  Globe,
  Github,
  DollarSign,
  Loader2,
  ExternalLink,
  Telescope,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    icon: Shield,
    title: "browser-based trading",
    description:
      "your private keys never leave your browser. all signing happens client-side using your connected wallet.",
  },
  {
    icon: Globe,
    title: "builder program",
    description:
      "orders are routed through polymarket's builder program for attribution. polyscoop is a registered builder.",
  },
  {
    icon: Github,
    title: "open source",
    description:
      "the entire codebase is open source. inspect the code, verify the claims, and contribute.",
    link: "https://github.com/sharbel/polyscoop",
    linkLabel: "view on github",
  },
  {
    icon: DollarSign,
    title: "no hidden fees",
    description:
      "polyscoop does not charge any fees. you only pay standard polymarket protocol fees.",
  },
];

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-dark-3 bg-gradient-to-br from-brand-900/40 via-surface-dark-1 to-surface-dark-1 p-8 sm:p-12">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-700/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-500/5 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-brand-400">
          <Telescope className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            polyscoop
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          how polyscoop works
        </h1>
        <p className="mt-3 max-w-lg text-gray-400">
          polyscoop is fully transparent. all trading happens in your browser,
          and every trade routed through us is publicly verifiable below.
        </p>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-white">how it works</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {HOW_IT_WORKS.map(
          ({ icon: Icon, title, description, link, linkLabel }) => (
            <div key={title} className="card space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">{title}</h3>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                {description}
              </p>
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  {linkLabel} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function BuilderTradesSection() {
  const { data, isLoading, isError } = useBuilderTrades();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">builder attribution</h2>
        {data && (
          <span className="badge">
            {data.count} trade{data.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">
        every trade routed through polyscoop's builder key is recorded on-chain
        and shown here in real time.
      </p>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <p className="text-sm">failed to load builder trades</p>
          </div>
        ) : !data?.trades.length ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <p className="text-sm">no trades yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-dark-3/50 text-gray-500">
                  <th className="px-4 py-2.5 text-left font-medium">time</th>
                  <th className="px-4 py-2.5 text-left font-medium">market</th>
                  <th className="px-4 py-2.5 text-left font-medium">side</th>
                  <th className="px-4 py-2.5 text-right font-medium">size</th>
                  <th className="px-4 py-2.5 text-right font-medium">price</th>
                  <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">
                    outcome
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">
                    status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-dark-3/30">
                {data.trades.map((t) => {
                  const isBuy = t.side.toUpperCase() === "BUY";
                  const time = t.match_time
                    ? new Date(t.match_time).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-surface-dark-2/50"
                    >
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-gray-500">
                        {time}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2 text-gray-300">
                        {shortenAddress(t.market)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 font-bold",
                            isBuy
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {isBuy ? "buy" : "sell"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-300">
                        {t.size}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-300">
                        {t.price}
                      </td>
                      <td className="hidden px-4 py-2 text-gray-400 sm:table-cell">
                        {t.outcome || "—"}
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="badge">{t.status || "—"}</span>
                      </td>
                      <td className="px-4 py-2">
                        {t.transaction_hash ? (
                          <a
                            href={`https://polygonscan.com/tx/${t.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-brand-400 hover:text-brand-300"
                          >
                            {shortenAddress(t.transaction_hash)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function LinksSection() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white">learn more</h2>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://docs.polymarket.com/#builder-api"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          polymarket builder docs
        </a>
        <a
          href="https://github.com/sharbel/polyscoop"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <Github className="h-3.5 w-3.5" />
          project github
        </a>
        <Link
          to="/"
          className="btn-ghost inline-flex items-center gap-1.5 text-xs"
        >
          back to dashboard
        </Link>
      </div>
    </section>
  );
}

export function TransparencyPage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <HowItWorksSection />
      <BuilderTradesSection />
      <LinksSection />
    </div>
  );
}
