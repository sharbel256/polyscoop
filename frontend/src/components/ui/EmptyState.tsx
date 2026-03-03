import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { slideUp } from "@/lib/motion";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex items-center justify-center py-16 text-foreground-muted",
        className,
      )}
    >
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-accent-purple/20">
          <Icon className="h-6 w-6 text-foreground-muted" />
        </div>
        <p className="mt-3 text-sm">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-foreground-muted">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
