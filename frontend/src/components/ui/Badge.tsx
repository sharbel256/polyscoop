import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scaleIn } from "@/lib/motion";

interface BadgeProps {
  variant?: "green" | "red" | "blue" | "yellow" | "gray";
  animated?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  green: "bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-500/20",
  red: "bg-red-900/40 text-red-400 ring-1 ring-red-500/20",
  blue: "bg-brand-900/40 text-brand-400 ring-1 ring-brand-500/20",
  yellow: "bg-yellow-900/40 text-yellow-400 ring-1 ring-yellow-500/20",
  gray: "bg-surface-hover text-foreground-secondary ring-1 ring-white/[0.06]",
};

export function Badge({
  variant = "gray",
  animated = false,
  className,
  children,
}: BadgeProps) {
  const classes = cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    variantStyles[variant],
    animated && "animate-pulse-glow",
    className,
  );

  return (
    <motion.span
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={classes}
    >
      {children}
    </motion.span>
  );
}
