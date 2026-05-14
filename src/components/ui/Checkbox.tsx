import { forwardRef, type InputHTMLAttributes } from "react";
import { useFieldContext } from "@/components/ui/field-context";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ invalid, className, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const ctx = useFieldContext();
    const finalId = id ?? ctx?.id;
    const finalInvalid = invalid ?? ctx?.invalid ?? false;
    const finalDescribedBy = ariaDescribedBy ?? ctx?.describedBy;
    return (
      <input
        ref={ref}
        type="checkbox"
        id={finalId}
        aria-invalid={finalInvalid ? true : undefined}
        aria-describedby={finalDescribedBy}
        className={cn(
          "border-line text-accent focus-visible:ring-accent rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          finalInvalid && "border-danger",
          className,
        )}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";
