import type { JSX } from "react";

export const App = (): JSX.Element => {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-semibold text-ink">stackr</h1>
      <p className="mt-2 text-ink-muted">Encontre seu stack ótimo de cartões. Em construção.</p>
    </main>
  );
};
