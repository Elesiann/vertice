import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { useFieldContext } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

const SELECT_BASE =
  "border-line text-ink bg-surface-raised w-full rounded-md border px-3 py-1.5 text-base outline-none transition focus:ring-2 sm:py-2 sm:text-sm";

const SELECT_STATE = {
  default: "focus:border-accent focus:ring-accent/20",
  invalid: "border-danger focus:border-danger focus:ring-danger/20",
} as const;

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, id, "aria-describedby": ariaDescribedBy, children, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.id;
    const finalInvalid = invalid ?? ctx?.invalid ?? false;
    const finalRequired = ctx?.required ?? false;
    const finalDescribedBy = ariaDescribedBy ?? ctx?.describedBy;
    return (
      <select
        ref={ref}
        id={finalId}
        aria-invalid={finalInvalid ? true : undefined}
        aria-required={finalRequired ? true : undefined}
        aria-describedby={finalDescribedBy}
        className={cn(
          SELECT_BASE,
          finalInvalid ? SELECT_STATE.invalid : SELECT_STATE.default,
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
