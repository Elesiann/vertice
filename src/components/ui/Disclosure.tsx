import { type JSX, type ReactNode, useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { m } from "framer-motion";
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
  "text-ink hover:text-accent focus-visible:ring-accent cursor-pointer list-none px-4 py-3 font-semibold transition outline-none select-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-offset-2";

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
  const [height, setHeight] = useState<number>(0);

  const handleToggle = useCallback(() => {
    const node = contentRef.current;
    if (!node) {
      setOpen((prev) => !prev);
      return;
    }
    if (open) {
      setHeight(node.scrollHeight);
      requestAnimationFrame(() => {
        setHeight(0);
      });
    } else {
      setHeight(0);
      requestAnimationFrame(() => {
        const n = contentRef.current;
        if (n) setHeight(n.scrollHeight);
      });
    }
    setOpen((prev) => !prev);
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
        <ChevronDown
          aria-hidden
          size={16}
          className={cn(
            "shrink-0 transition-transform duration-200 ease-out",
            open && "rotate-180",
            variant === "inline" ? "text-ink-subtle" : "text-ink-muted",
          )}
        />
      </button>
      <m.div
        initial={false}
        animate={{ height }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div ref={contentRef} className={variant === "inline" ? "" : "px-4 pb-4"}>
          {children}
        </div>
      </m.div>
    </div>
  );
};
