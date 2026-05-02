import type { JSX, ReactNode } from "react";
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from "@/components/ui/button-styles";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}

export const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  ariaLabel,
}: ButtonProps): JSX.Element => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`${BUTTON_BASE} px-4 ${BUTTON_VARIANT[variant]}`}
  >
    {children}
  </button>
);
