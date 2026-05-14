import { useId, useMemo, type JSX, type ReactNode } from "react";
import { FieldContext, type FieldContextValue } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

export const Field = ({
  label,
  children,
  id,
  hint,
  error,
  required,
  className,
}: FieldProps): JSX.Element => {
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
      ...(required ? { required: true } : {}),
      ...(describedBy !== undefined ? { describedBy } : {}),
    }),
    [finalId, hasError, required, describedBy],
  );

  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn("flex flex-col", className)}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label htmlFor={finalId} className="text-ink block text-sm font-semibold">
            {label}
            {required ? (
              <span aria-hidden="true" className="text-danger ml-0.5">
                *
              </span>
            ) : null}
          </label>
          {hasHint ? <HintTooltip hint={hint} /> : null}
        </div>
        {children}
        {hasHint ? (
          <p id={hintId} className="text-ink-subtle mt-1.5 text-xs leading-relaxed sm:sr-only">
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

const HintTooltip = ({ hint }: { hint: ReactNode }): JSX.Element => (
  <span className="group relative hidden sm:inline-flex">
    <button
      type="button"
      aria-label="Mais informação"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
        }
      }}
      className="text-ink-subtle hover:text-accent focus-visible:text-accent focus-visible:ring-accent inline-flex size-4 items-center justify-center rounded-full border border-current text-[10px] leading-none font-bold transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      ?
    </button>
    <span
      role="tooltip"
      className="border-line bg-surface-raised text-ink pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-xs leading-relaxed opacity-0 shadow-md transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
    >
      {hint}
    </span>
  </span>
);
