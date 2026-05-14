import type { JSX } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { GitCompareArrows, X } from "lucide-react";
import { useCompareActions } from "@/features/compare/useCompareActions";
import { ROUTES } from "@/lib/routes-constants";

export const CompareFloatingBar = (): JSX.Element | null => {
  const location = useLocation();
  const { count, compareHref, clear } = useCompareActions();
  const isComparePage = location.pathname === ROUTES.COMPARE;

  if (isComparePage) return null;

  return (
    <AnimatePresence>
      {count > 0 && (
        <m.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-40 sm:right-auto sm:left-1/2 sm:w-[25rem] sm:-translate-x-1/2"
        >
          <div className="border-line bg-surface-raised flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 shadow-md">
            <div className="text-ink flex min-w-0 flex-1 items-center gap-2">
              <GitCompareArrows size={18} className="text-ink-subtle shrink-0" aria-hidden="true" />
              <span className="truncate text-sm font-medium">
                {count === 1 ? "1 cartão selecionado" : `${String(count)} selecionados`}
              </span>
            </div>
            <Link
              to={compareHref}
              className="bg-action text-action-ink hover:bg-action-hover focus-visible:ring-accent inline-flex min-h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Comparar
            </Link>
            <button
              type="button"
              aria-label="Limpar comparação"
              onClick={clear}
              className="text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-accent inline-flex size-9 shrink-0 items-center justify-center rounded-md transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
