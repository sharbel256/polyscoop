import { motion } from "framer-motion";

interface GradientBackgroundProps {
  variant?: "hero" | "fullscreen";
}

export function GradientBackground({
  variant = "hero",
}: GradientBackgroundProps) {
  const isFullscreen = variant === "fullscreen";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${isFullscreen ? "" : "rounded-[inherit]"}`}
    >
      <motion.div
        className="absolute -left-20 -top-20 h-[60%] w-[60%] rounded-full bg-accent-cyan/10 blur-[100px]"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -50, 20, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-10 right-0 h-[50%] w-[50%] rounded-full bg-accent-purple/10 blur-[100px]"
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 30, -40, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="absolute left-1/3 top-1/3 h-[40%] w-[40%] rounded-full bg-brand-500/8 blur-[80px]"
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}
