import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useBuilderTrades } from "@/hooks/useBuilderTrades";
import { shortenAddress } from "@/lib/utils";
import { Card, Spinner, SideBadge, GradientBackground } from "@/components/ui";
import {
  staggerContainer,
  staggerItem,
  tableRowVariant,
  slideUp,
} from "@/lib/motion";
import {
  Shield,
  Globe,
  Github,
  DollarSign,
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
    link: "https://github.com/sharbel256/polyscoop",
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
    <motion.div variants={slideUp} initial="hidden" animate="visible">
      <div className="card gradient-border relative overflow-hidden">
        <GradientBackground variant="hero" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-400">
            <Telescope className="h-5 w-5" />
            <span className="gradient-text text-sm font-semibold uppercase tracking-wider">
              polyscoop
            </span>
          </div>
          <h1 className="mt-3 text-h1 tracking-tight text-foreground">
            how polyscoop works
          </h1>
          <p className="mt-3 max-w-lg text-sm text-foreground-secondary sm:text-base">
            polyscoop is fully transparent. all trading happens in your browser,
            and every trade routed through us is publicly verifiable below.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorksSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 text-foreground">how it works</h2>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2"
      >
        {HOW_IT_WORKS.map(
          ({ icon: Icon, title, description, link, linkLabel }) => (
            <motion.div key={title} variants={staggerItem}>
              <Card className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
                    <Icon className="h-4 w-4 text-brand-400" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-foreground-secondary">
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
              </Card>
            </motion.div>
          ),
        )}
      </motion.div>
    </section>
  );
}

function BuilderTradesSection() {
  const { data, isLoading, isError } = useBuilderTrades();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-foreground">builder attribution</h2>
        {data && (
          <span className="badge ring-1 ring-white/[0.06]">
            {data.count} trade{data.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-xs text-foreground-muted">
        every trade routed through polyscoop's builder key is recorded on-chain
        and shown here in real time.
      </p>

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16 text-foreground-muted">
            <p className="text-sm">failed to load builder trades</p>
          </div>
        ) : !data?.trades.length ? (
          <div className="flex items-center justify-center py-16 text-foreground-muted">
            <p className="text-sm">no trades yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-foreground-muted">
                  <th className="px-2 py-2.5 text-left font-medium sm:px-4">
                    time
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium sm:px-4">
                    market
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium sm:px-4">
                    side
                  </th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                    size
                  </th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                    price
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">
                    outcome
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">
                    status
                  </th>
                  <th className="px-2 py-2.5 text-left font-medium sm:px-4">
                    tx
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-white/[0.03]"
              >
                {data.trades.map((t) => {
                  const time = t.match_time
                    ? new Date(t.match_time).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <motion.tr
                      key={t.id}
                      variants={tableRowVariant}
                      className="transition-colors hover:bg-surface-elevated/30"
                    >
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-foreground-muted sm:px-4">
                        {time}
                      </td>
                      <td className="max-w-[120px] truncate px-2 py-2 text-foreground-secondary sm:max-w-[200px] sm:px-4">
                        {shortenAddress(t.market)}
                      </td>
                      <td className="px-2 py-2 sm:px-4">
                        <SideBadge side={t.side} />
                      </td>
                      <td className="hidden px-4 py-2 text-right font-mono text-foreground-secondary sm:table-cell">
                        {t.size}
                      </td>
                      <td className="hidden px-4 py-2 text-right font-mono text-foreground-secondary sm:table-cell">
                        {t.price}
                      </td>
                      <td className="hidden px-4 py-2 text-foreground-secondary sm:table-cell">
                        {t.outcome || "—"}
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="badge ring-1 ring-white/[0.06]">
                          {t.status || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-2 sm:px-4">
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
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

function LinksSection() {
  return (
    <section className="space-y-3">
      <h2 className="text-h2 text-foreground">learn more</h2>
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
