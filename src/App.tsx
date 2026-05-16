import type { JSX } from "react";
import { HelmetProvider } from "react-helmet-async";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SessionProvider } from "@/context/SessionContext";
import { router } from "@/routes";

export const App = (): JSX.Element => (
  <HelmetProvider>
    <ErrorBoundary>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ErrorBoundary>
  </HelmetProvider>
);
