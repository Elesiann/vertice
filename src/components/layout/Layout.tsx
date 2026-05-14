import { type JSX, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
import { SWRConfig } from "swr";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes-constants";

const NAV_ITEMS = [
  { label: "Calcular", to: ROUTES.INPUT },
  { label: "Catálogo", to: ROUTES.CATALOG },
  { label: "Comparar", to: ROUTES.COMPARE },
  { label: "Resultado", to: ROUTES.RESULTS },
] as const;

const isRouteActive = (pathname: string, to: string): boolean => {
  if (to === ROUTES.HOME) return pathname === ROUTES.HOME;
  if (to === ROUTES.CATALOG) return pathname.startsWith(ROUTES.CATALOG);
  if (to === ROUTES.RESULTS) return pathname === ROUTES.RESULTS || pathname === ROUTES.ALTERNATIVES;
  return pathname === to;
};

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "vertice.theme.v1";

const readInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme: ThemeMode): void => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
};

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps): JSX.Element => (
  <button
    type="button"
    aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    onClick={onToggle}
    className="border-line text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-accent inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
  >
    {theme === "dark" ? (
      <Sun size={17} aria-hidden="true" />
    ) : (
      <Moon size={17} aria-hidden="true" />
    )}
  </button>
);

const AppHeader = (): JSX.Element => {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const closeMobileMenu = (): void => {
    setMobileMenuOpen(false);
  };
  const toggleTheme = (): void => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <header className="border-line bg-surface/95 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-10 items-center justify-between gap-4">
          <Link
            to={ROUTES.HOME}
            onClick={closeMobileMenu}
            className="focus-visible:ring-accent -ml-1 inline-flex min-w-0 items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Ir para o início do Vértice"
          >
            <img
              src="/assets/vertice_logo.png"
              alt="Vértice logo"
              className="border-line bg-surface-raised size-10 rounded-md object-cover shadow-sm"
              width={40}
              height={40}
            />
            <span className="text-lg font-bold">Vértice</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden min-w-0 flex-1 justify-center sm:flex"
          >
            <div className="flex min-w-max items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-accent inline-flex min-h-9 items-center border-b-2 px-3 text-sm font-medium transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2",
                      active
                        ? "border-accent text-ink"
                        : "text-ink-muted hover:text-ink border-transparent",
                    )}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={ROUTES.INPUT}
              onClick={closeMobileMenu}
              className="bg-action text-action-ink hover:bg-action-hover focus-visible:ring-accent hidden min-h-9 shrink-0 items-center justify-center rounded-md px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:inline-flex"
            >
              Calcular
            </Link>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                setMobileMenuOpen((open) => !open);
              }}
              className="border-line text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-accent inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:hidden"
            >
              {mobileMenuOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav id="mobile-navigation" aria-label="Navegação principal" className="sm:hidden">
            <div className="border-line mt-3 flex flex-col border-t pt-2">
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-accent flex min-h-11 items-center justify-between rounded-md px-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      active ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                    {active ? <span className="bg-accent h-px w-5" aria-hidden="true" /> : null}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
};

export const Layout = (): JSX.Element => {
  const location = useLocation();
  return (
    <LazyMotion features={domAnimation}>
      <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 }}>
        <AppHeader />
        <m.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          <Outlet />
        </m.div>
        <CompareFloatingBar />
      </SWRConfig>
    </LazyMotion>
  );
};
