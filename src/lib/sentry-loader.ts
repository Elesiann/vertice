// Static named imports let Rolldown tree-shake @sentry/react. A dynamic
// namespace import("@sentry/react") forces every export into the chunk;
// this module exposes only what the app actually calls.
export { init, browserTracingIntegration, addBreadcrumb, setUser } from "@sentry/react";
