import type { JSX } from "react";
import {
  PercentCircle,
  PiggyBank,
  Plane,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type WaiverCategory = "monthly_spend" | "investment" | "cashback" | "miles" | "general";

const ICON_BY_CATEGORY: Record<WaiverCategory, LucideIcon> = {
  monthly_spend: Wallet,
  investment: PiggyBank,
  cashback: PercentCircle,
  miles: Plane,
  general: ShieldCheck,
};

export const waiverIcon = (category: string): LucideIcon =>
  Object.hasOwn(ICON_BY_CATEGORY, category)
    ? ICON_BY_CATEGORY[category as WaiverCategory]
    : ShieldCheck;

interface WaiverIconProps {
  category: WaiverCategory;
  className?: string;
  ariaLabel?: string;
}

export const WaiverIcon = ({ category, className, ariaLabel }: WaiverIconProps): JSX.Element => {
  const Icon = waiverIcon(category);
  const isDecorative = ariaLabel === undefined;
  return (
    <Icon
      size={16}
      className={cn("text-ink-muted shrink-0", className)}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={ariaLabel}
      role={isDecorative ? undefined : "img"}
    />
  );
};
