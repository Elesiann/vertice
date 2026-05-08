import { type DetailsHTMLAttributes, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "panel" | "inline";

interface DisclosureProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children"> {
  summary: ReactNode;
  variant?: Variant;
  children: ReactNode;
  summaryClassName?: string;
}

const PANEL_WRAP = "border-line bg-surface-sunken rounded-md border";

const SUMMARY_PANEL =
  "text-ink hover:text-accent focus-visible:ring-accent block cursor-pointer list-none px-4 py-3 font-semibold transition outline-none select-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden";

export const Disclosure = ({
  summary,
  variant = "panel",
  children,
  className,
  summaryClassName,
  ...rest
}: DisclosureProps): JSX.Element => {
  const isInline = variant === "inline";
  return (
    <details className={cn(isInline ? "disclosure-inline" : PANEL_WRAP, className)} {...rest}>
      <summary className={cn(!isInline && SUMMARY_PANEL, summaryClassName)}>{summary}</summary>
      {children}
    </details>
  );
};
