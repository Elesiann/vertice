import type { JSX } from "react";
import { cn } from "@/lib/cn";

interface CardArtProps {
  brand: string;
  tier: string;
  bank?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const BRAND_GRADIENT: Record<string, string> = {
  visa: "from-slate-700/40 to-blue-950/50",
  mastercard: "from-red-800/35 to-orange-700/35",
  amex: "from-slate-500/35 to-slate-700/45",
  elo: "from-yellow-700/30 to-red-700/30",
  hipercard: "from-red-800/40 to-red-950/45",
};

const SIZE: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "w-[84px]",
  sm: "w-[120px]",
  md: "w-[240px]",
  lg: "w-[320px]",
};

const TIER_LABEL: Record<string, string> = {
  standard: "Standard",
  gold: "Gold",
  platinum: "Platinum",
  black: "Black",
  infinite: "Infinite",
};

export const CardArt = ({
  brand,
  tier,
  bank,
  size = "md",
  className,
}: CardArtProps): JSX.Element => {
  const gradient = BRAND_GRADIENT[brand.toLowerCase()] ?? "from-surface-sunken to-surface-raised";
  const tierLabel = TIER_LABEL[tier.toLowerCase()] ?? tier;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br shadow-sm",
        gradient,
        "border border-white/10",
        SIZE[size],
        className,
      )}
      style={{ aspectRatio: "1.586 / 1" }}
      aria-hidden="true"
    >
      {size === "xs" ? (
        <div className="absolute bottom-2 left-2 h-3 w-4 rounded-[2px] border border-white/20 bg-white/10" />
      ) : (
        <>
          <div className="absolute top-1/3 left-4 h-5 w-7 rounded-sm border border-white/20 bg-white/10" />
          <div className="absolute top-1/4 right-4 size-8 rounded-full border border-white/15" />
          <div className="absolute top-[30%] right-5 size-6 rounded-full border border-white/10" />
          <span
            className="absolute bottom-3 left-4 text-xs font-semibold tracking-widest text-white/50 uppercase"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
          >
            {tierLabel}
          </span>
          {bank !== undefined && (
            <span className="absolute top-3 right-3 text-[10px] font-medium tracking-wide text-white/30 uppercase">
              {bank}
            </span>
          )}
        </>
      )}
    </div>
  );
};
