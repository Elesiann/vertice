import type { JSX } from "react";

interface ShoutoutLineProps {
  text: string;
}

export const ShoutoutLine = ({ text }: ShoutoutLineProps): JSX.Element => (
  <p className="rounded-md bg-surface-sunken p-4 text-center text-base italic text-ink-muted">
    “{text}”
  </p>
);
