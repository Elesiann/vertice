import { type HTMLAttributes, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "neutral" | "danger" | "warning" | "gold";

const TONE: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  neutral: "bg-surface-sunken text-ink-muted",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  gold: "bg-gold-soft text-gold",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

export const Badge = ({
  tone = "neutral",
  className,
  children,
  ...rest
}: BadgeProps): JSX.Element => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap",
      TONE[tone],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);
