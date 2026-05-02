import type { JSX } from "react";
import type { ParseStatus } from "@/types";

interface StatusPillProps {
  status: ParseStatus;
}

const KIND_LABEL: Record<ParseStatus["kind"], string> = {
  pending: "Aguardando",
  parsing: "Lendo",
  success: "OK",
  error: "Falhou",
};

const KIND_CLASSES: Record<ParseStatus["kind"], string> = {
  pending: "bg-surface-sunken text-ink-muted",
  parsing: "bg-accent/10 text-accent",
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-rose-100 text-rose-700",
};

export const StatusPill = ({ status }: StatusPillProps): JSX.Element => (
  <span
    className={`inline-flex items-center rounded px-2 py-1 text-sm font-medium ${KIND_CLASSES[status.kind]}`}
    role="status"
  >
    {KIND_LABEL[status.kind]}
    {status.kind === "parsing" ? ` ${String(status.pct)}%` : null}
  </span>
);
