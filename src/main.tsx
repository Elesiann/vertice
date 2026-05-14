import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import * as Sentry from "@sentry/react";
import "@/styles.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
