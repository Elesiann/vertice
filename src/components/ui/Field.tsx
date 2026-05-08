import { useId, useMemo, type JSX, type ReactNode } from "react";
import { FieldContext, type FieldContextValue } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

export const Field = ({ label, children, id, hint, error, className }: FieldProps): JSX.Element => {
  const generatedId = useId();
  const finalId = id ?? generatedId;
  const errorId = `${finalId}-error`;
  const hintId = `${finalId}-hint`;
  const hasError = error !== undefined && error !== null && error !== false;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const describedBy =
    [hasError ? errorId : null, hasHint ? hintId : null]
      .filter((v): v is string => v !== null)
      .join(" ") || undefined;

  const ctx = useMemo<FieldContextValue>(
    () => ({
      id: finalId,
      invalid: hasError,
      ...(describedBy !== undefined ? { describedBy } : {}),
    }),
    [finalId, hasError, describedBy],
  );

  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn("flex flex-col", className)}>
        <label htmlFor={finalId} className="text-ink mb-1.5 block text-sm font-semibold">
          {label}
        </label>
        {children}
        {hasHint ? (
          <p id={hintId} className="text-ink-subtle mt-1.5 text-xs">
            {hint}
          </p>
        ) : null}
        {hasError ? (
          <p id={errorId} role="alert" className="text-danger mt-1.5 text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
};
