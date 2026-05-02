import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { InputForm } from "@/features/input/InputForm";

export const InputPage = (): JSX.Element => (
  <ErrorBoundary>
    <InputForm />
  </ErrorBoundary>
);
