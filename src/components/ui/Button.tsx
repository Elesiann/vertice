import type { JSX, ReactNode } from "react";
import { m } from "framer-motion";
import {
  BUTTON_BASE,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
  className?: string;
}

const Spinner = (): JSX.Element => (
  <m.span
    aria-hidden="true"
    className="inline-block size-4 rounded-full border-2 border-current border-t-transparent"
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
  />
);

export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  isLoading = false,
  type = "button",
  ariaLabel,
  className,
}: ButtonProps): JSX.Element => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    aria-busy={isLoading ? true : undefined}
    aria-label={ariaLabel}
    className={cn(BUTTON_BASE, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className)}
  >
    {isLoading ? (
      <>
        <Spinner />
        <span className="ml-2">{children}</span>
      </>
    ) : (
      children
    )}
  </button>
);
