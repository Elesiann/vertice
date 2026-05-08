import type { JSX, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BUTTON_BASE,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  ariaLabel?: string;
  className?: string;
}

export const ButtonLink = ({
  to,
  children,
  variant = "primary",
  size = "lg",
  ariaLabel,
  className,
}: ButtonLinkProps): JSX.Element => (
  <Link
    to={to}
    aria-label={ariaLabel}
    className={cn(BUTTON_BASE, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className)}
  >
    {children}
  </Link>
);
