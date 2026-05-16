import { useId, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CompareWinnerTooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

/**
 * CSS-only tooltip wrapper used to explain why a comparator cell wins its
 * category. Trigger is hover/focus on the wrapped value (cursor: help, the
 * cell is keyboard-focusable). The tooltip text is also linked via
 * aria-describedby so screen readers announce the why-wins explanation.
 */
export const CompareWinnerTooltip = ({
  text,
  children,
  className,
}: CompareWinnerTooltipProps): JSX.Element => {
  const tooltipId = useId();
  return (
    <span className={cn("group relative inline-flex", className)}>
      <span
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- tooltip trigger needs to be keyboard-focusable so the help text shows on Tab; aria-describedby links it to the tooltip content.
        tabIndex={0}
        aria-describedby={tooltipId}
        className="focus-visible:ring-accent cursor-help rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={tooltipId}
        className="border-line bg-surface-raised text-ink pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-xs leading-relaxed font-normal whitespace-normal opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
};
