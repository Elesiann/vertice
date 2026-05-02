import type { JSX, ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}

const VARIANT_CLASSES = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
} as const;

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
    className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
  >
    {children}
  </button>
);
