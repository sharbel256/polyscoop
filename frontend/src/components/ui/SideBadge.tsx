import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scaleIn } from "@/lib/motion";

interface SideBadgeProps {
  side: "BUY" | "SELL" | string;
}

export function SideBadge({ side }: SideBadgeProps) {
  const isBuy = side.toUpperCase() === "BUY";
  return (
    <motion.span
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={cn(
        "w-10 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-bold ring-1",
        isBuy
          ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
          : "bg-red-500/20 text-red-400 ring-red-500/30",
      )}
    >
      {isBuy ? "buy" : "sell"}
    </motion.span>
  );
}
