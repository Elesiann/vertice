import { useState, type JSX } from "react";
import { formatBrl, formatPoints } from "@/lib/format";
import type { StackEvaluation } from "@/types";

interface MathAccordionProps {
  stack: StackEvaluation;
}

export const MathAccordion = ({ stack }: MathAccordionProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-md border border-ink-subtle/30">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span>Ver o math</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <dl className="divide-y divide-ink-subtle/20 px-4 pb-4 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Pontos earned year-1</dt>
            <dd className="text-ink">{formatPoints(stack.yearOneEarnedPoints)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Welcome bonus year-1</dt>
            <dd className="text-ink">{formatPoints(stack.yearOneWelcomeBonusPoints)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Total de pontos</dt>
            <dd className="text-ink">{formatPoints(stack.yearOneTotalPoints)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Valor bruto em R$</dt>
            <dd className="text-ink">{formatBrl(stack.yearOneTotalValueBrl)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Anuidade líquida year-1</dt>
            <dd className="text-ink">{formatBrl(stack.yearOneAnnualFeeBrl)}</dd>
          </div>
          <div className="flex justify-between py-2 font-medium">
            <dt className="text-ink">Valor líquido year-1</dt>
            <dd className="text-accent">{formatBrl(stack.yearOneNetValueBrl)}</dd>
          </div>
          {stack.warnings.length > 0 ? (
            <div className="py-2">
              <dt className="text-ink-muted">Avisos</dt>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                {stack.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
};
