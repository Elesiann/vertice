import type { JSX } from "react";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SessionProvider } from "@/context/SessionContext";
import { router } from "@/routes";

export const App = (): JSX.Element => (
  <ErrorBoundary>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </ErrorBoundary>
);
