import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ResultsView } from "@/features/results/ResultsView";

export const ResultsPage = (): JSX.Element => (
  <ErrorBoundary>
    <ResultsView />
  </ErrorBoundary>
);
