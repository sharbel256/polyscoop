import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Trophy, Copy, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", icon: LayoutDashboard, label: "dashboard" },
  { to: "/leaderboard", icon: Trophy, label: "leaders" },
  { to: "/copytrade", icon: Copy, label: "copy" },
  { to: "/portfolio", icon: Briefcase, label: "portfolio" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-surface/70 backdrop-blur-2xl md:hidden">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5",
                active ? "text-brand-400" : "text-foreground-muted",
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400 to-accent-purple"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "drop-shadow-[0_0_6px_rgba(91,124,255,0.5)]",
                )}
              />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-surface/70" />
    </nav>
  );
}
