import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ReviewView } from "@/features/review/ReviewView";

export const ReviewPage = (): JSX.Element => (
  <ErrorBoundary>
    <ReviewView />
  </ErrorBoundary>
);
