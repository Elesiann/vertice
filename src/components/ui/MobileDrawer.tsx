import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type JSX, type ReactNode } from "react";

interface MobileDrawerProps {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  open: boolean;
}

// Swipe up = dedo move para cima = deltaY negativo
const SWIPE_UP_PX = 60; // mínimo de pixels pra cima para fechar
const SWIPE_UP_RATIO = 0.15; // ou 15% da altura da tela

export const MobileDrawer = ({
  children,
  labelledBy,
  onClose,
  open,
}: MobileDrawerProps): JSX.Element => {
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (touchStartY.current === null) return;

    const delta = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;

    const swipedUpEnough = delta < -SWIPE_UP_PX || delta < -(window.innerHeight * SWIPE_UP_RATIO);

    if (swipedUpEnough) onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="text-ink fixed inset-0 z-50 flex flex-col sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <m.div
            className="flex min-h-screen flex-col bg-[var(--color-surface)]"
            initial={{ y: "-6%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="border-line flex min-h-16 items-center justify-between border-b px-4">
              <p id={labelledBy} className="text-lg font-bold">
                Vértice
              </p>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={onClose}
                className="border-line text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-accent inline-flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {children}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
};
