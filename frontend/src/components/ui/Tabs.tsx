import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
  layoutId?: string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
  layoutId = "tabs-indicator",
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "glass-subtle inline-flex items-center gap-1 rounded-lg p-1",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "text-white"
              : "text-foreground-secondary hover:text-foreground",
          )}
        >
          {value === opt.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-md bg-gradient-to-r from-brand-500 to-brand-700"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {opt.icon}
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}
