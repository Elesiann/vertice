// Isolated so that when VITE_SENTRY_REPLAY !== "true" Rolldown's dead-code
// elimination removes the dynamic import("./sentry-replay-loader") call and
// this module — along with rrweb — never enters the bundle.
export { replayIntegration } from "@sentry/react";
