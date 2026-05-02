import type { JSX } from "react";
import { Link } from "react-router-dom";

export const HomePage = (): JSX.Element => (
  <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
    <h1 className="text-4xl font-bold text-ink sm:text-5xl">stackr</h1>
    <p className="mt-4 text-xl text-ink-muted">
      Encontre seu stack ótimo de cartões brasileiros. Suba suas faturas, veja o math, decida.
    </p>
    <p className="mt-2 text-ink-subtle">
      Tudo acontece no seu navegador. Sem login, sem upload pra servidor, sem rastreamento.
    </p>
    <Link
      to="/upload"
      className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-6 font-medium text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      Começar →
    </Link>
  </main>
);
