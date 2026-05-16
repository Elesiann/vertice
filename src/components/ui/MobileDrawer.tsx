import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useRef, type JSX, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const delta = touch.clientY - touchStartY.current;
    touchStartY.current = null;

    const swipedUpEnough = delta < -SWIPE_UP_PX || delta < -(window.innerHeight * SWIPE_UP_RATIO);

    if (swipedUpEnough) onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <Dialog
          open={open}
          onClose={onClose}
          labelledBy={labelledBy}
          initialFocusRef={closeButtonRef}
          className="text-ink fixed inset-0 z-50 flex flex-col sm:hidden"
        >
          <m.div
            className="flex min-h-screen flex-col bg-[var(--color-surface)]"
            initial={reduceMotion ? false : { y: "-6%" }}
            animate={{ y: 0 }}
            {...(reduceMotion ? {} : { exit: { y: "-100%" } })}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="border-line flex min-h-16 items-center justify-between border-b px-4">
              <p id={labelledBy} className="text-lg font-bold">
                <span className="sr-only">Menu de navegação — </span>Vértice
              </p>
              <button
                ref={closeButtonRef}
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
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
};
