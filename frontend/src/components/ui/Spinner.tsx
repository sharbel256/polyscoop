import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

export function Spinner({ size = "md", className }: SpinnerProps) {
  const s = sizeMap[size];
  const r = s / 2 - 2;

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={cn("text-brand-500", className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <defs>
        <linearGradient id="spinner-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#4b6bff" />
        </linearGradient>
      </defs>
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        fill="none"
        stroke="url(#spinner-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${r * Math.PI * 1.2} ${r * Math.PI * 0.8}`}
      />
    </motion.svg>
  );
}
