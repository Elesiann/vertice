import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";
import { App } from "@/App";
import * as Sentry from "@sentry/react";
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

if (isValidSentryDsn(sentryDsn)) {
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
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
