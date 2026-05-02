import type { JSX } from "react";

interface DuplicatesBannerProps {
  count: number;
}

export const DuplicatesBanner = ({ count }: DuplicatesBannerProps): JSX.Element | null => {
  if (count === 0) return null;
  return (
    <aside
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      Removidas {count} transações duplicadas (mesmo dia, mesmo merchant, mesmo valor, mesmo banco).
      Os totais já refletem o ajuste.
    </aside>
  );
};
