import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, label, className, ...props }, ref) => {
    const input = (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn("input", icon && "pl-9", className)}
          {...props}
        />
      </div>
    );

    if (label) {
      return (
        <div>
          <label className="mb-1 block text-xs text-foreground-muted">
            {label}
          </label>
          {input}
        </div>
      );
    }

    return input;
  },
);

Input.displayName = "Input";
