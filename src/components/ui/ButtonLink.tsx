import type { JSX, ReactNode } from "react";
import { Link } from "react-router-dom";
import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from "@/components/ui/button-styles";

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  ariaLabel?: string;
}

export const ButtonLink = ({
  to,
  children,
  variant = "primary",
  ariaLabel,
}: ButtonLinkProps): JSX.Element => (
  <Link to={to} aria-label={ariaLabel} className={`${BUTTON_BASE} px-6 ${BUTTON_VARIANT[variant]}`}>
    {children}
  </Link>
);
