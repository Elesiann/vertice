import { useEffect, useRef, type JSX, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";

interface BaseDialogProps {
  children: ReactNode;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  onClose: () => void;
  open: boolean;
}

// XOR: a dialog must declare exactly one accessible name source.
// `labelledBy` points at a visible element id inside the dialog (preferred when
// the header text doubles as the dialog name). `ariaLabel` is a literal string
// (preferred when there is no visible heading).
type DialogProps = BaseDialogProps &
  ({ labelledBy: string; ariaLabel?: never } | { ariaLabel: string; labelledBy?: never });

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const visibleFocusable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true",
  );

export const Dialog = ({
  children,
  className,
  labelledBy,
  ariaLabel,
  initialFocusRef,
  onClose,
  open,
}: DialogProps): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef<string>("");

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = window.setTimeout(() => {
      const root = rootRef.current;
      if (root === null) return;
      const target = initialFocusRef?.current ?? visibleFocusable(root)[0] ?? root;
      target.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const root = rootRef.current;
      if (root === null) return;
      const focusable = visibleFocusable(root);
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusInitial);
      document.body.style.overflow = previousOverflowRef.current;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [initialFocusRef, onClose, open]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cn("outline-none", className)}
    >
      {children}
    </div>
  );
};
