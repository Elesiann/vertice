import { StrictMode, useEffect } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { Metric } from "web-vitals";
import { App } from "@/App";
import "@/styles.css";

const envValue = (key: string): string | undefined => {
  const value: unknown = Reflect.get(import.meta.env, key);
  return typeof value === "string" ? value : undefined;
};

const sentryDsn = envValue("VITE_SENTRY_DSN");
const sentryReplayEnabled = envValue("VITE_SENTRY_REPLAY") === "true";
const sentryTracesSampleRate = Number(envValue("VITE_SENTRY_TRACES_SAMPLE_RATE"));
const tracesSampleRate = Number.isFinite(sentryTracesSampleRate)
  ? sentryTracesSampleRate
  : import.meta.env.PROD
    ? 0.05
    : 1;

const appVersion = envValue("VITE_APP_VERSION") ?? "dev";
const environment = import.meta.env.MODE;

const isValidSentryDsn = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/[^/\s]+@[^/\s]+\/\d+$/u.test(value);

const ANONYMOUS_USER_KEY = "vertice.anonUserId";

const ensureAnonymousUserId = (): string => {
  try {
    const stored = window.sessionStorage.getItem(ANONYMOUS_USER_KEY);
    if (typeof stored === "string" && stored.length > 0) return stored;
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(ANONYMOUS_USER_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

/**
 * Signals "first paint complete" to the Playwright prerender crawler. The
 * crawler waits on `window.__PRERENDER_READY__ === true` before serializing
 * the DOM. Setting it from an effect ensures React's first commit ran; the
 * 50ms timeout gives downstream effects (data fetches, theme apply) a tick
 * to start so `waitForLoadState('networkidle')` in the script can finish them
 * off. No-op on real user sessions (the flag is just set and never read).
 */
const PrerenderReadySignal = (): null => {
  useEffect(() => {
    const id = window.setTimeout(() => {
      (window as Window & { __PRERENDER_READY__?: boolean }).__PRERENDER_READY__ = true;
    }, 50);
    return () => {
      window.clearTimeout(id);
    };
  }, []);
  return null;
};

const tree = (
  <StrictMode>
    <App />
    <PrerenderReadySignal />
  </StrictMode>
);

/**
 * Path-aware hydrate vs createRoot. We can't rely on `#root` being empty for
 * SPA-only routes: Cloudflare Pages' `_redirects` catch-all overrides static
 * matches, so /results and /compare receive the home page's prerendered HTML
 * (which would mismatch). Instead, we check the URL against the set of paths
 * we know we prerender. If the current path is one of them, hydrate; otherwise
 * wipe `#root` and createRoot — the brief flash of stale home content on
 * SPA-only routes is preferable to React 18 hydration warnings that would
 * impact LCP attribution.
 */
const PRERENDERED_STATIC_PATHS = new Set<string>([
  "/",
  "/input",
  "/sobre",
  "/privacidade",
  "/termos",
]);
const CARD_DETAIL_PATTERN = /^\/cards\/[^/]+\/?$/u;

const isPrerenderedPath = (pathname: string): boolean =>
  PRERENDERED_STATIC_PATHS.has(pathname) || CARD_DETAIL_PATTERN.test(pathname);

if (rootElement.firstElementChild !== null && isPrerenderedPath(window.location.pathname)) {
  hydrateRoot(rootElement, tree);
} else {
  // Either the shell is empty (no prerender for this build) or the SPA
  // fallback served the wrong page's HTML. Discard whatever is there and
  // mount fresh so React doesn't try to reconcile a stale tree.
  rootElement.replaceChildren();
  createRoot(rootElement).render(tree);
}

const loadSentry = async (): Promise<void> => {
  const [Sentry, webVitals] = await Promise.all([import("@sentry/react"), import("web-vitals")]);
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = webVitals;

  Sentry.init({
    dsn: sentryDsn,
    release: appVersion,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      ...(sentryReplayEnabled
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              maskAllInputs: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],
    tracesSampleRate,
    replaysSessionSampleRate: sentryReplayEnabled ? 0.01 : 0,
    replaysOnErrorSampleRate: sentryReplayEnabled ? 1.0 : 0,
    beforeBreadcrumb(breadcrumb) {
      const rawData: unknown = breadcrumb.data;
      const url: unknown =
        rawData !== null && typeof rawData === "object" ? Reflect.get(rawData, "url") : undefined;
      if (
        breadcrumb.category === "fetch" &&
        typeof url === "string" &&
        url.includes("/score-lab/recommendations")
      ) {
        return null;
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request !== undefined) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });

  Sentry.setUser({ id: ensureAnonymousUserId() });

  const reportVital = (metric: Metric): void => {
    Sentry.addBreadcrumb({
      category: "web-vitals",
      level: "info",
      message: `${metric.name} ${metric.rating}`,
      data: {
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    });
  };

  onCLS(reportVital);
  onFCP(reportVital);
  onINP(reportVital);
  onLCP(reportVital);
  onTTFB(reportVital);
};

if (isValidSentryDsn(sentryDsn)) {
  const schedule = (): void => {
    void loadSentry().catch(() => {
      /* Sentry failure must never block the app. */
    });
  };
  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(schedule);
  } else {
    setTimeout(schedule, 5000);
  }
}
