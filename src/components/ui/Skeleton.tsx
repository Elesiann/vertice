import type { JSX } from "react";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  label?: string;
  /** When false, the parent already exposes the busy state. */
  announce?: boolean;
}

/**
 * Inert placeholder block. Pulses subtly to suggest loading without distracting
 * from the real content. Respects `prefers-reduced-motion` via the global
 * tailwind utility (which disables animation when the OS preference is set).
 */
export const Skeleton = ({
  className,
  label = "Carregando",
  announce = true,
}: SkeletonProps): JSX.Element => (
  <span
    role={announce ? "status" : undefined}
    aria-live={announce ? "polite" : undefined}
    aria-label={announce ? label : undefined}
    className={cn(
      "bg-surface-sunken inline-block animate-pulse rounded motion-reduce:animate-none",
      className,
    )}
  />
);

interface SkeletonGroupProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  label?: string;
}

export const SkeletonGroup = ({
  count = 3,
  className,
  itemClassName = "h-4 w-full",
  label = "Carregando conteúdo",
}: SkeletonGroupProps): JSX.Element => (
  <div role="status" aria-live="polite" aria-label={label} className={cn("space-y-2", className)}>
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} announce={false} className={itemClassName} />
    ))}
  </div>
);
