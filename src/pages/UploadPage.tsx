import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UploadFlow } from "@/features/upload/UploadFlow";

export const UploadPage = (): JSX.Element => (
  <ErrorBoundary>
    <UploadFlow />
  </ErrorBoundary>
);
