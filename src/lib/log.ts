import * as Sentry from "@sentry/react";

interface LogContext {
  /**
   * Stable tag used to filter the Sentry Issues page. Keep low cardinality
   * (e.g. "api-fetch", "api-contract", "session-storage", "recommendation-cache").
   */
  surface: string;
  extra?: Record<string, unknown>;
}

const isTest = import.meta.env.MODE === "test";
const isDev = import.meta.env.DEV && !isTest;

/**
 * Centralized error reporter. Wraps Sentry.captureException with consistent
 * tagging so:
 *   - the Sentry Issues page can be filtered by `surface`
 *   - DEV still sees the error in the devtools console
 *   - tests stay quiet (no console noise, no Sentry init either way)
 *
 * Use only in catches that intentionally swallow the error to preserve UX
 * (storage fallback, network retry exhausted, contract mismatch, etc.). For
 * thrown errors that escape to the ErrorBoundary or to window.onerror, the
 * Sentry SDK already captures them automatically — do not add log.error
 * there or you will double-report.
 */
export const log = {
  error: (error: unknown, ctx: LogContext): void => {
    if (isDev) {
      console.error(`[${ctx.surface}]`, error, ctx.extra);
    }
    Sentry.captureException(error, {
      tags: { surface: ctx.surface },
      ...(ctx.extra !== undefined ? { extra: ctx.extra } : {}),
    });
  },
};
