import { useState } from "react";

const SIZE_MAP = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
} as const;

/** Deterministic gradient from an address's hex chars. */
function gradientFromAddress(address: string) {
  const hex = address.replace("0x", "").toLowerCase();
  const h1 = parseInt(hex.slice(0, 4), 16) % 360;
  const h2 = parseInt(hex.slice(4, 8), 16) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 60%, 45%), hsl(${h2}, 60%, 35%))`;
}

interface WalletAvatarProps {
  address: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}

export function WalletAvatar({
  address,
  imageUrl,
  size = "sm",
}: WalletAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size];
  const hex = address.replace("0x", "").slice(0, 2).toLowerCase();

  const ringClass = "ring-2 ring-brand-500/20";

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${ringClass}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-white/80 ${ringClass}`}
      style={{ background: gradientFromAddress(address) }}
    >
      {hex}
    </div>
  );
}
