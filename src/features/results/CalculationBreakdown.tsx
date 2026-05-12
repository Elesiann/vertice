import { type JSX } from "react";
import { cn } from "@/lib/cn";
import { formatBrl, formatPoints, formatRoiMultiple, formatUsd } from "@/lib/format";
import {
  primaryProgram,
  programRedemptionLabel,
  stackAccessibilitySummary,
  transferBonusOptimisticNetBrl,
} from "@/features/results/alternatives";
import type { ScoreLabRequirement, SpendingProfile, StackEvaluation } from "@/types";

// One row of the líquido waterfall. `valueBrl` is signed — positive lines add, negative ones
// subtract — and the lines sum to `modeledAnnual.netReturnBrl`.
interface BreakdownLine {
  label: string;
  caption: string | null;
  valueBrl: number;
}

const formatPointValue = (v: number): string =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  });

// Shows how the headline "líquido em 12 meses" was formed: value of points/cashback, travel
// benefits, foreign-exchange cost and annual fee, then the câmbio, access barrier and break-even
// footnotes. Renders nothing without a scoreLab. Replaces the old "Ver cálculo completo" dump.
export const CalculationBreakdown = ({
  stack,
  profile,
  ptaxRate,
  ptaxAsOf,
}: {
  stack: StackEvaluation;
  profile: SpendingProfile;
  ptaxRate?: number | undefined;
  ptaxAsOf?: string | undefined;
}): JSX.Element | null => {
  const lab = stack.scoreLab;
  if (lab === undefined) return null;
  const m = lab.modeledAnnual;
  const program = primaryProgram(stack);
  const isCashback = program === "cashback";

  const lines: BreakdownLine[] = [];

  // Value of accumulated points (or cashback).
  if (m.grossValueBrl > 0.01 || isCashback) {
    const pointCaption =
      !isCashback && m.totalPoints > 0
        ? `${formatPoints(m.totalPoints)} pts${
            m.welcomeBonusPoints > 0
              ? ` (${formatPoints(m.earnedPoints)} do gasto + ${formatPoints(m.welcomeBonusPoints)} de bônus de entrada)`
              : " acumulados"
          } · ~${formatPointValue(m.grossValueBrl / m.totalPoints)}/pt em ${programRedemptionLabel(program)}`
        : null;
    lines.push({
      label: isCashback ? "Cashback" : "Valor em pontos",
      caption: isCashback ? "creditado ao longo do ano" : pointCaption,
      valueBrl: m.grossValueBrl,
    });
  }

  // Travel benefits actually used in the modeled year.
  if (m.benefitUtilityBrl > 0.01) {
    const b = m.benefitBreakdown;
    const parts =
      b !== undefined
        ? [
            b.lounge.totalBrl > 0 ? `sala VIP ${formatBrl(b.lounge.totalBrl)}` : null,
            b.insurance.totalBrl > 0 ? `seguro viagem ${formatBrl(b.insurance.totalBrl)}` : null,
            b.baggage.totalBrl > 0 ? `bagagem ${formatBrl(b.baggage.totalBrl)}` : null,
          ].filter((p): p is string => p !== null)
        : [];
    lines.push({
      label: "Benefícios de viagem",
      caption: parts.length > 0 ? parts.join(" · ") : null,
      valueBrl: m.benefitUtilityBrl,
    });
  }

  // Foreign-exchange cost (spread + IOF on international spend).
  if (m.internationalCostBrl > 0.01) {
    const annualUsd = profile.monthlyInternationalUsd * 12;
    lines.push({
      label: "Custo no exterior",
      caption:
        annualUsd > 0
          ? `${formatUsd(annualUsd)}/ano · câmbio${ptaxRate !== undefined ? ` ${formatBrl(ptaxRate)}` : ""} + IOF`
          : "spread de câmbio + IOF",
      valueBrl: -m.internationalCostBrl,
    });
  }

  // Annual fee — always shown, even at zero (the caption explains why it's waived). Build the
  // waiver phrase from the requirement kind + amount rather than the raw API label (which is
  // unformatted, e.g. "r$ 35000/mês").
  const waiverPhrase = (req: ScoreLabRequirement | undefined): string | null => {
    if (req === undefined) return null;
    if (req.kind === "spend-fee-waiver") return `gasto a partir de ${formatBrl(req.required)}/mês`;
    if (req.kind === "investment-fee-waiver")
      return `${formatBrl(req.required)} investidos no emissor`;
    return null;
  };
  const waiverApplied = lab.benefitsApplied.find(
    (x) => x.kind === "annual-fee-waiver" && x.valueBrl > 0,
  );
  const waiverMissed = lab.benefitsNotApplied.find((x) => x.kind === "annual-fee-waiver");
  let feeCaption: string | null = null;
  if (m.recurringAnnualFeeBrl <= 0.01) {
    const applied = waiverPhrase(waiverApplied?.requirement);
    feeCaption = applied !== null ? `isenta com ${applied}` : "sem anuidade";
  } else {
    const missed = waiverPhrase(waiverMissed?.requirement);
    feeCaption = missed !== null ? `isenta com ${missed} — não atingido no seu cenário` : null;
  }
  lines.push({ label: "Anuidade", caption: feeCaption, valueBrl: -m.recurringAnnualFeeBrl });

  const footnotes: string[] = [];
  if (m.netReturnBrl < -0.01) {
    footnotes.push("No seu volume de gasto este cartão custa mais do que devolve.");
  }
  const optimisticNetBrl = transferBonusOptimisticNetBrl(stack);
  if (optimisticNetBrl !== null) {
    footnotes.push(
      `Com bônus de transferência de pontos (cenário otimista), o líquido pode chegar a ${formatBrl(optimisticNetBrl)}/ano. O número acima usa o valor sem bônus.`,
    );
  }
  if (ptaxRate !== undefined) {
    const asOf =
      ptaxAsOf !== undefined ? ` de ${new Date(ptaxAsOf).toLocaleDateString("pt-BR")}` : "";
    footnotes.push(`Câmbio: ${formatBrl(ptaxRate)} por US$ 1 — PTAX${asOf}.`);
  }
  footnotes.push(stackAccessibilitySummary(profile, stack));
  if (lab.breakEvenMonthlySpendBrl !== null || lab.roiMultiple !== null) {
    const bits = [
      lab.breakEvenMonthlySpendBrl !== null
        ? `Se paga a partir de ${formatBrl(lab.breakEvenMonthlySpendBrl)}/mês de gasto`
        : null,
      lab.roiMultiple !== null
        ? `cada R$ 1 de anuidade rende ${formatRoiMultiple(lab.roiMultiple)}`
        : null,
    ].filter((x): x is string => x !== null);
    footnotes.push(`${bits.join(" · ")}.`);
  }

  const net = m.netReturnBrl;
  const netTone = net > 0.01 ? "text-accent" : net < -0.01 ? "text-warning" : "text-ink";

  return (
    <div className="border-line/50 border-t px-4 py-5 sm:px-6">
      <dl className="divide-line divide-y">
        {lines.map((line) => {
          const add = line.valueBrl >= 0;
          return (
            <div
              key={line.label}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-3.5"
            >
              <dt className="text-ink text-sm font-medium">{line.label}</dt>
              <dd
                className={cn(
                  "text-num tabular text-sm font-semibold",
                  add ? "text-accent" : "text-ink",
                )}
              >
                {add ? "+" : "−"} {formatBrl(Math.abs(line.valueBrl))}
              </dd>
              {line.caption !== null ? (
                <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">{line.caption}</p>
              ) : null}
            </div>
          );
        })}
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-3.5">
          <dt className="text-ink text-sm font-semibold">Líquido em 12 meses</dt>
          <dd className={cn("text-num tabular text-base font-semibold", netTone)}>
            {net < -0.01 ? `− ${formatBrl(Math.abs(net))}` : formatBrl(net)}
          </dd>
        </div>
      </dl>
      <ul className="text-ink-muted mt-4 space-y-1.5 text-xs leading-relaxed">
        {footnotes.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden className="text-ink-subtle/60">
              ·
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
