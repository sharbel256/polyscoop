import { motion } from "framer-motion";
import { Telescope, Fish, Eye, ArrowLeftRight } from "lucide-react";
import { GradientBackground } from "@/components/ui";
import { staggerContainer, staggerItem } from "@/lib/motion";

export function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-surface">
      {/* Fullscreen gradient background */}
      <GradientBackground variant="fullscreen" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-24"
      >
        {/* Logo */}
        <motion.div
          variants={staggerItem}
          className="flex items-center gap-3"
        >
          <div className="glow-brand flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
            <Telescope className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            polyscoop
          </span>
        </motion.div>

        {/* Tagline */}
        <motion.h1
          variants={staggerItem}
          className="mt-8 max-w-lg text-center text-display gradient-text"
        >
          market intelligence for prediction markets
        </motion.h1>
        <motion.p
          variants={staggerItem}
          className="mt-4 max-w-md text-center text-foreground-secondary"
        >
          surface anomalies across polymarket — all in real time.
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          variants={staggerContainer}
          className="mt-8 grid max-w-lg gap-3 sm:mt-12 sm:gap-4 sm:grid-cols-3"
        >
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
            <motion.div
              key={label}
              variants={staggerItem}
              className="card gradient-border text-center"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
                <Icon className="h-5 w-5 text-brand-400" />
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground-secondary">
                {label}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Coming soon badge */}
        <motion.div
          variants={staggerItem}
          className="mt-12 rounded-full border border-brand-500/30 bg-brand-900/20 px-5 py-2 text-sm font-medium text-brand-400 animate-pulse-glow gradient-border"
        >
          coming soon
        </motion.div>
      </motion.div>

      {/* Minimal footer */}
      <footer className="relative border-t border-white/[0.06] py-6 text-center text-xs text-foreground-muted">
        polyscoop — powered by polymarket
      </footer>
    </div>
  );
}
