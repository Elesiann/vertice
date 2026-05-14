import type { JSX, ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  isLoading?: boolean;
  ariaLabel?: string;
  className?: string;
}

const Spinner = (): JSX.Element => (
  <motion.span
    aria-hidden="true"
    className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
  />
);

export const ButtonLink = ({
  to,
  children,
  variant = "primary",
  size = "lg",
  isLoading = false,
  ariaLabel,
  className,
}: ButtonLinkProps): JSX.Element => (
  <Link
    to={to}
    aria-label={ariaLabel}
    aria-disabled={isLoading ? true : undefined}
    className={cn(
      BUTTON_BASE,
      BUTTON_SIZE[size],
      BUTTON_VARIANT[variant],
      isLoading && "pointer-events-none opacity-50",
      className,
    )}
  >
    {isLoading ? (
      <>
        <Spinner />
        <span className="ml-2">{children}</span>
      </>
    ) : (
      children
    )}
  </Link>
);
