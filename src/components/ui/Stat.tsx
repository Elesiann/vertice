import { type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  block?: boolean;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
}

export const Stat = ({
  label,
  value,
  block = false,
  className,
  valueClassName,
  labelClassName,
}: StatProps): JSX.Element => (
  <div
    role="group"
    className={cn(
      block ? "flex flex-col gap-1" : "flex items-baseline justify-between gap-4",
      className,
    )}
  >
    <dt className={cn("text-ink-subtle text-sm", labelClassName)}>{label}</dt>
    <dd className={cn("text-num text-ink font-semibold", valueClassName)}>{value}</dd>
  </div>
);
