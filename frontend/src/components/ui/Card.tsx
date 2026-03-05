import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cardHover } from "@/lib/motion";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive";
  noPadding?: boolean;
  accent?: boolean;
}

export function Card({
  variant = "default",
  noPadding = false,
  accent = false,
  className,
  children,
  ...props
}: CardProps) {
  const classes = cn(
    "card",
    noPadding && "!p-0 sm:!p-0",
    accent && "gradient-border",
    className,
  );

  if (variant === "interactive") {
    return (
      <motion.div
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        className={cn(classes, "cursor-pointer")}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
