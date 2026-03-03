import { motion } from "framer-motion";
import { formatUsd, formatCompact } from "@/lib/utils";
import { Card, AnimatedNumber } from "@/components/ui";
import { staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import { BarChart3, Activity, TrendingUp } from "lucide-react";

interface WalletStatsProps {
  totalVolume: number;
  totalTrades: number;
  volume7d?: number;
  rank7d?: number;
}

export function WalletStats({
  totalVolume,
  totalTrades,
  volume7d,
  rank7d,
}: WalletStatsProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
    >
      {[
        {
          icon: BarChart3,
          label: "total volume",
          value: totalVolume,
          format: formatUsd,
        },
        {
          icon: Activity,
          label: "total trades",
          value: totalTrades,
          format: formatCompact,
        },
        {
          icon: TrendingUp,
          label: "7d volume",
          value: volume7d ?? 0,
          format: formatUsd,
        },
        {
          icon: TrendingUp,
          label: "7d rank",
          value: rank7d ?? 0,
          format: (n: number) => (n > 0 ? `#${Math.round(n)}` : "—"),
        },
      ].map(({ icon: Icon, label, value, format }) => (
        <motion.div key={label} variants={staggerItem}>
          <motion.div variants={cardHover} initial="rest" whileHover="hover">
            <Card>
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <AnimatedNumber
                value={value}
                format={format}
                className="mt-1 block font-mono text-lg font-bold text-foreground"
              />
            </Card>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}
