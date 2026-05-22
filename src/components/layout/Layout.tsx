import { type JSX, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Menu, Moon, Sun } from "lucide-react";
import { SWRConfig } from "swr";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";
import { MobileDrawer } from "@/components/ui/MobileDrawer";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/cn";
import { useIsInitialRender } from "@/lib/initial-render";
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
  // Reads from `data-theme` on <html>, which is set synchronously by
  // public/theme-bootstrap.js before the bundle loads. This keeps the very
  // first React render deterministic across SSR/snapshot and the browser
  // (both see whatever the bootstrap script applied — no hydration mismatch
  // and no light-mode flash for dark-mode users).
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
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
            aria-label="Vértice — ir para o início"
          >
            <picture>
              <source srcSet="/assets/vertice_logo-80.webp" type="image/webp" />
              <img
                src="/assets/vertice_logo-80.png"
                alt=""
                className="border-line bg-surface-raised size-10 rounded-md object-cover shadow-sm"
                width={40}
                height={40}
                decoding="async"
                {...({ fetchpriority: "high" } as Record<string, string>)}
              />
            </picture>
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
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                setMobileMenuOpen(true);
              }}
              className="border-line text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-accent inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:hidden"
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <MobileDrawer open={mobileMenuOpen} onClose={closeMobileMenu} labelledBy="mobile-menu-title">
        <nav id="mobile-navigation" aria-label="Navegação principal" className="flex-1 px-4 py-6">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(pathname, item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-accent relative flex min-h-14 items-center justify-between rounded-md px-4 text-xl font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  {active && (
                    <span
                      className="bg-accent absolute top-3 bottom-3 left-0 w-1 rounded-full"
                      aria-hidden="true"
                    />
                  )}
                  <span className="pl-2">{item.label}</span>
                  {active && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                      className="text-accent shrink-0 opacity-70"
                    >
                      <path
                        d="M6.75 4.5L11.25 9L6.75 13.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </MobileDrawer>
    </header>
  );
};

const SkipLink = (): JSX.Element => (
  <a
    href="#main-content"
    className="bg-action text-action-ink focus-visible:ring-accent sr-only rounded-md px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2 focus-visible:ring-offset-2"
  >
    Pular para o conteúdo
  </a>
);

export const Layout = (): JSX.Element => {
  const location = useLocation();
  const isInitialRender = useIsInitialRender();
  return (
    <LazyMotion features={domAnimation}>
      <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 }}>
        <SkipLink />
        <AppHeader />
        <m.div
          id="main-content"
          tabIndex={-1}
          key={location.pathname}
          initial={isInitialRender ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className="focus:outline-none"
        >
          <Outlet />
        </m.div>
        <Footer />
        <CompareFloatingBar />
      </SWRConfig>
    </LazyMotion>
  );
};
