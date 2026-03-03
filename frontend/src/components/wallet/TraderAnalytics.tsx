import { motion } from "framer-motion";
import { cn, formatUsd } from "@/lib/utils";
import { Card } from "@/components/ui";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { TraderProfileData } from "@/lib/api";
import {
  Target,
  Bot,
  Clock,
  Layers,
  BarChart3,
  TrendingUp,
  Activity,
} from "lucide-react";

interface TraderAnalyticsProps {
  tp: TraderProfileData;
  score7d?: { roi: number; consistency: number } | null;
}

export function TraderAnalytics({ tp, score7d }: TraderAnalyticsProps) {
  const botColor =
    tp.bot_score < 0.3
      ? "text-emerald-400"
      : tp.bot_score < 0.6
        ? "text-yellow-400"
        : "text-red-400";

  const botLabel =
    tp.bot_score < 0.3
      ? "likely human"
      : tp.bot_score < 0.6
        ? "uncertain"
        : "likely bot";

  const timingLabel =
    tp.avg_entry_timing < 0.33
      ? "early"
      : tp.avg_entry_timing < 0.66
        ? "mid"
        : "late";

  // Bot score arc
  const arcRadius = 28;
  const arcCircumference = Math.PI * arcRadius;
  const arcFill = arcCircumference * tp.bot_score;

  const stats = [
    {
      icon: Bot,
      label: "bot score",
      value: (
        <div className="flex items-center gap-3">
          <svg width="64" height="36" viewBox="0 0 64 36" className="shrink-0">
            <path
              d="M 4 32 A 28 28 0 0 1 60 32"
              fill="none"
              stroke="rgb(var(--surface-hover))"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 4 32 A 28 28 0 0 1 60 32"
              fill="none"
              stroke="url(#bot-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${arcFill} ${arcCircumference}`}
            />
            <defs>
              <linearGradient id="bot-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <p className={cn("font-mono text-lg font-bold", botColor)}>
              {(tp.bot_score * 100).toFixed(0)}%
            </p>
            <p className={cn("text-xs", botColor)}>{botLabel}</p>
          </div>
        </div>
      ),
    },
    {
      icon: Clock,
      label: "active hours",
      value: (
        <p className="mt-1 font-mono text-lg font-bold text-foreground">
          {tp.active_hours}/24
        </p>
      ),
    },
    {
      icon: Layers,
      label: "primary category",
      value: (
        <>
          <p className="mt-1 text-sm font-bold text-foreground">
            {tp.primary_category || "—"}
          </p>
          <p className="text-xs text-foreground-muted">
            {(tp.category_concentration * 100).toFixed(0)}% concentrated
          </p>
        </>
      ),
    },
    {
      icon: BarChart3,
      label: "markets traded",
      value: (
        <p className="mt-1 font-mono text-lg font-bold text-foreground">
          {tp.market_count}
        </p>
      ),
    },
    {
      icon: TrendingUp,
      label: "avg entry timing",
      value: (
        <>
          <p className="mt-1 font-mono text-lg font-bold text-foreground">
            {timingLabel}
          </p>
          <p className="text-xs text-foreground-muted">
            {(tp.avg_entry_timing * 100).toFixed(0)}% into lifecycle
          </p>
        </>
      ),
    },
    {
      icon: Clock,
      label: "avg hold duration",
      value: (
        <p className="mt-1 font-mono text-lg font-bold text-foreground">
          {tp.avg_hold_duration_h < 24
            ? `${tp.avg_hold_duration_h.toFixed(1)}h`
            : `${(tp.avg_hold_duration_h / 24).toFixed(1)}d`}
        </p>
      ),
    },
    {
      icon: Activity,
      label: "avg position size",
      value: (
        <p className="mt-1 font-mono text-lg font-bold text-foreground">
          {formatUsd(tp.avg_position_size_usd)}
        </p>
      ),
    },
    ...(score7d
      ? [
          {
            icon: TrendingUp,
            label: "7d roi / consistency",
            value: (
              <>
                <p
                  className={cn(
                    "mt-1 font-mono text-lg font-bold",
                    score7d.roi >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {score7d.roi >= 0 ? "+" : ""}
                  {(score7d.roi * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-foreground-muted">
                  consistency: {score7d.consistency.toFixed(2)}
                </p>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
          <Target className="h-3.5 w-3.5 text-brand-400" />
        </div>
        trader analytics
      </h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {stats.map(({ icon: Icon, label, value }) => (
          <motion.div
            key={label}
            variants={staggerItem}
            className="rounded-lg bg-surface-elevated/40 p-3"
          >
            <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Icon className="h-3 w-3" />
              {label}
            </div>
            {value}
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
