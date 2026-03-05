import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary:
    "bg-gradient-to-r from-brand-500 to-brand-700 text-white hover:shadow-[0_0_20px_rgba(91,124,255,0.3)] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "border border-white/[0.06] backdrop-blur-lg text-foreground disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "text-foreground-secondary hover:bg-surface-elevated/60 hover:text-foreground",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.97]",
          variantStyles[variant],
          variant === "secondary" &&
            "bg-surface-elevated/60 hover:bg-surface-hover/80",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="url(#spinner-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="60 30"
            />
            <defs>
              <linearGradient
                id="spinner-gradient"
                x1="0"
                y1="0"
                x2="24"
                y2="24"
              >
                <stop stopColor="#22d3ee" />
                <stop offset="1" stopColor="#4b6bff" />
              </linearGradient>
            </defs>
          </svg>
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
