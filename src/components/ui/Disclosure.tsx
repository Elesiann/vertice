import { type JSX, type ReactNode, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Variant = "panel" | "inline";

interface DisclosureProps {
  summary: ReactNode;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  defaultOpen?: boolean;
}

const PANEL_WRAP = "border-line bg-surface-sunken rounded-md border";

const SUMMARY_PANEL =
  "text-ink hover:text-accent focus-visible:ring-accent block cursor-pointer list-none px-4 py-3 font-semibold transition outline-none select-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-offset-2";

export const Disclosure = ({
  summary,
  variant = "panel",
  children,
  className,
  summaryClassName,
  defaultOpen = false,
}: DisclosureProps): JSX.Element => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">(defaultOpen ? "auto" : 0);

  const measureRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (node && open) {
        setHeight(node.scrollHeight);
      }
    },
    [open],
  );

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (open) setHeight("auto");
  }, [open]);

  const handleHeightUpdate = useCallback(() => {
    if (!open) return;
    const node = contentRef.current;
    if (node) setHeight(node.scrollHeight);
  }, [open]);

  return (
    <div className={cn(!(variant === "inline") && PANEL_WRAP, className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left",
          variant === "inline" ? "disclosure-inline" : SUMMARY_PANEL,
          summaryClassName,
        )}
      >
        <span className="flex-1">{summary}</span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "shrink-0 text-xs",
            variant === "inline" ? "text-ink-subtle" : "text-ink-muted",
          )}
        >
          ▼
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onAnimationComplete={handleAnimationComplete}
        onUpdate={handleHeightUpdate}
        className="overflow-hidden"
      >
        <div ref={measureRef} className={variant === "inline" ? "" : "px-4 pb-4"}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
