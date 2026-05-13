import type { JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface BackLinkProps {
  to?: string;
  children: string;
  className?: string;
}

export const BackLink = ({ to, children, className }: BackLinkProps): JSX.Element => {
  const navigate = useNavigate();

  if (to !== undefined) {
    return (
      <Link
        to={to}
        className={cn(
          "text-ink-muted hover:text-ink focus-visible:ring-accent inline-flex items-center gap-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          className,
        )}
      >
        <ChevronLeft size={16} aria-hidden />
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void navigate(-1);
      }}
      className={cn(
        "text-ink-muted hover:text-ink focus-visible:ring-accent inline-flex items-center gap-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      <ChevronLeft size={16} aria-hidden />
      {children}
    </button>
  );
};
