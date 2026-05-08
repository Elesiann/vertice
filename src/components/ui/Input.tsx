import { forwardRef, type InputHTMLAttributes } from "react";
import { useFieldContext } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

const INPUT_BASE =
  "border-line text-ink placeholder:text-ink-subtle bg-surface-raised w-full rounded-md border px-3 py-1.5 text-base outline-none transition focus:ring-2 sm:py-2 sm:text-sm";

const INPUT_STATE = {
  default: "focus:border-accent focus:ring-accent/20",
  invalid: "border-danger focus:border-danger focus:ring-danger/20",
} as const;

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.id;
    const finalInvalid = invalid ?? ctx?.invalid ?? false;
    const finalDescribedBy = ariaDescribedBy ?? ctx?.describedBy;
    return (
      <input
        ref={ref}
        id={finalId}
        aria-invalid={finalInvalid ? true : undefined}
        aria-describedby={finalDescribedBy}
        className={cn(
          INPUT_BASE,
          finalInvalid ? INPUT_STATE.invalid : INPUT_STATE.default,
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
