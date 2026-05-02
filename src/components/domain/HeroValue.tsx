import type { JSX } from "react";
import { formatBrl } from "@/lib/format";

interface HeroValueProps {
  topNetValueBrl: number;
  moneyOnTheTableBrl?: number;
}

export const HeroValue = ({ topNetValueBrl, moneyOnTheTableBrl }: HeroValueProps): JSX.Element => {
  if (moneyOnTheTableBrl !== undefined && moneyOnTheTableBrl > 0) {
    return (
      <section className="text-center" aria-labelledby="hero-label">
        <p id="hero-label" className="text-sm uppercase tracking-wide text-ink-muted">
          Você está deixando na mesa
        </p>
        <h1 className="mt-2 text-5xl font-bold text-rose-700 sm:text-6xl">
          {formatBrl(moneyOnTheTableBrl)}
        </h1>
        <p className="mt-2 text-ink-muted">por ano em pontos não aproveitados.</p>
      </section>
    );
  }
  return (
    <section className="text-center" aria-labelledby="hero-label">
      <p id="hero-label" className="text-sm uppercase tracking-wide text-ink-muted">
        Você ganha
      </p>
      <h1 className="mt-2 text-5xl font-bold text-accent sm:text-6xl">
        {formatBrl(topNetValueBrl)}
      </h1>
      <p className="mt-2 text-ink-muted">por ano em pontos com este stack.</p>
    </section>
  );
};
