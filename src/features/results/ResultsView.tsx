import type { JSX } from "react";
import { Link } from "react-router-dom";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { formatBrl, formatUsd } from "@/lib/format";
import { ROUTES } from "@/routes";
import type { LeaderboardAxisId, SpendingProfile, StackEvaluation } from "@/types";

const AXIS_LABEL: Record<LeaderboardAxisId, string> = {
  "net-return": "Retorno",
  liquidity: "Liquidez",
  "annual-fee": "Anuidade",
  simplicity: "Simplicidade",
  accessibility: "Acessibilidade",
};

const LIQUIDITY_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const RELATIONSHIP_LABEL: Record<
  NonNullable<StackEvaluation["cards"][number]["requiresRelationship"]>,
  string
> = {
  open: "aberto",
  checking: "correntista",
  investment: "investimento",
  private: "private",
};

const cardsInUse = (stack: StackEvaluation): StackEvaluation["cards"] => {
  const activeCards = stack.cards.filter((card) => {
    const alloc = stack.allocation.find((item) => item.cardId === card.id);
    return (
      alloc !== undefined && (alloc.monthlyDomesticBrl > 0 || alloc.monthlyInternationalUsd > 0)
    );
  });
  return activeCards.length > 0 ? activeCards : stack.cards;
};

const stackId = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.id)
    .slice()
    .sort()
    .join("|");

const stackLabel = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.name)
    .join(" + ");

const stackRelationshipSummary = (stack: StackEvaluation): string => {
  const levels = Array.from(
    new Set(stack.cards.map((card) => RELATIONSHIP_LABEL[card.requiresRelationship ?? "checking"])),
  );
  return levels.join(" + ");
};

const stackFinancialRequirement = (
  stack: StackEvaluation,
): {
  minInvestmentBrl: number;
  minInvestmentUsd: number;
  investmentFeeWaiverBrl: number;
  aggregateBrl: number;
  requiredInvestmentUsd: number;
} =>
  cardsInUse(stack).reduce(
    (highest, card) => {
      const minInvestmentBrl = card.minInvestmentBrl ?? 0;
      const minInvestmentUsd = card.minInvestmentUsd ?? 0;
      const investmentFeeWaiverBrl = card.investmentFeeWaiverBrl ?? 0;
      const aggregateBrl =
        card.requiredInvestmentBrl ?? Math.max(minInvestmentBrl, investmentFeeWaiverBrl);
      const requiredInvestmentUsd = card.requiredInvestmentUsd ?? minInvestmentUsd;
      return {
        minInvestmentBrl: Math.max(highest.minInvestmentBrl, minInvestmentBrl),
        minInvestmentUsd: Math.max(highest.minInvestmentUsd, minInvestmentUsd),
        investmentFeeWaiverBrl: Math.max(highest.investmentFeeWaiverBrl, investmentFeeWaiverBrl),
        aggregateBrl: Math.max(highest.aggregateBrl, aggregateBrl),
        requiredInvestmentUsd: Math.max(highest.requiredInvestmentUsd, requiredInvestmentUsd),
      };
    },
    {
      minInvestmentBrl: 0,
      minInvestmentUsd: 0,
      investmentFeeWaiverBrl: 0,
      aggregateBrl: 0,
      requiredInvestmentUsd: 0,
    },
  );

const stackInvestmentRequirementLabel = (stack: StackEvaluation): string => {
  const requirement = stackFinancialRequirement(stack);
  const parts: string[] = [];
  if (requirement.minInvestmentBrl > 0) {
    parts.push(`acesso ${formatBrl(requirement.minInvestmentBrl)}`);
  }
  if (requirement.minInvestmentUsd > 0) {
    parts.push(`acesso ${formatUsd(requirement.minInvestmentUsd)}`);
  }
  if (requirement.investmentFeeWaiverBrl > 0) {
    parts.push(`isenção ${formatBrl(requirement.investmentFeeWaiverBrl)}`);
  }
  if (parts.length === 0 && requirement.aggregateBrl > 0) {
    return `Até ${formatBrl(requirement.aggregateBrl)}`;
  }
  return parts.length > 0 ? parts.join(" · ") : "Sem exigência";
};

const stackAccessibilitySummary = (profile: SpendingProfile, stack: StackEvaluation): string => {
  const requirement = stackFinancialRequirement(stack);
  const requiredInvestmentBrl = requirement.aggregateBrl;
  if (requiredInvestmentBrl <= 0 && requirement.requiredInvestmentUsd <= 0) {
    return "Sem exigência financeira adicional neste stack.";
  }

  if (requiredInvestmentBrl <= 0 && requirement.requiredInvestmentUsd > 0) {
    return `Este stack exige investimento de acesso em dólar: ${formatUsd(requirement.requiredInvestmentUsd)}.`;
  }

  if (profile.availableToInvestBrl === undefined) {
    return `Para a melhor acessibilidade, considere ${formatBrl(requiredInvestmentBrl)} disponíveis para investir.`;
  }

  if (profile.availableToInvestBrl >= requiredInvestmentBrl) {
    return `Seu valor disponível (${formatBrl(profile.availableToInvestBrl)}) cobre a exigência de investimento (${formatBrl(requiredInvestmentBrl)}).`;
  }

  return `A exigência estimada (${formatBrl(requiredInvestmentBrl)}) supera os ${formatBrl(profile.availableToInvestBrl)} informados. O stack segue comparado sem bloqueio automático.`;
};

const currencyDelta = (value: number): string => {
  if (value > 0) return `+${formatBrl(value)}`;
  return formatBrl(value);
};

const axisMetric = (axisId: LeaderboardAxisId, stack: StackEvaluation): string => {
  if (axisId === "annual-fee") return `${formatBrl(stack.yearOneAnnualFeeBrl)} de anuidade`;
  if (axisId === "liquidity") return `${LIQUIDITY_LABEL[stack.liquidity]} liquidez`;
  if (axisId === "simplicity") {
    const count = cardsInUse(stack).length;
    return `${String(count)} cartão${count > 1 ? "es" : ""}`;
  }
  if (axisId === "accessibility") {
    return `${stackRelationshipSummary(stack)} · ${stackInvestmentRequirementLabel(stack).toLowerCase()}`;
  }
  return `${formatBrl(stack.yearOneNetValueBrl)} líquido`;
};

const axisReasons = (topStack: StackEvaluation, runnerUp?: StackEvaluation): string[] => {
  const reasons: string[] = [];
  if (runnerUp) {
    const delta = topStack.yearOneNetValueBrl - runnerUp.yearOneNetValueBrl;
    reasons.push(`${formatBrl(delta)} de vantagem no retorno líquido frente ao segundo colocado.`);
  } else {
    reasons.push("Lidera o retorno líquido no recorte atual.");
  }
  reasons.push(
    `Entrega ${formatBrl(topStack.yearOneNetValueBrl)} líquido por ano com ${formatBrl(topStack.yearOneAnnualFeeBrl)} de anuidade total.`,
  );
  const cards = cardsInUse(topStack).length;
  reasons.push(
    `Opera com ${String(cards)} cartão${cards > 1 ? "es" : ""} e liquidez ${LIQUIDITY_LABEL[topStack.liquidity].toLowerCase()}.`,
  );
  return reasons;
};

const scoreLabReasons = (topStack: StackEvaluation, runnerUp?: StackEvaluation): string[] =>
  topStack.scoreLab?.reasons.slice(0, 5) ?? axisReasons(topStack, runnerUp);

const scoreText = (value: number): string => value.toFixed(2);

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();

  if (profile === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <section className="panel space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-3xl font-semibold text-ink">Nada para mostrar ainda</h1>
            <p className="text-sm text-ink-muted">Preencha seus dados para gerar a recomendação.</p>
            <div>
              <ButtonLink to={ROUTES.INPUT}>Ir para o formulário</ButtonLink>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <section className="panel p-6 text-center text-ink-muted sm:p-8">
            Calculando recomendação...
          </section>
        </div>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <section className="panel space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-3xl font-semibold text-ink">Não conseguimos recomendar</h1>
            <p className="text-sm text-ink-muted">{result.error.message}</p>
            <div>
              <Link to={ROUTES.INPUT} className="plain-link">
                Voltar e ajustar os dados
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const recommendation = result.value;
  const topStack = recommendation.topStack;
  const scoreLab = topStack.scoreLab;
  const scoreLabMeta = recommendation.scoreLab;
  const netReturnAxis = recommendation.leaderboardsByAxis.find(
    (axis) => axis.axisId === "net-return",
  );
  const reasons = scoreLabReasons(topStack, netReturnAxis?.stacks[1]);
  const accessibilitySummary = stackAccessibilitySummary(profile, topStack);

  const currentComparison =
    (profile.currentCardIds?.length ?? 0) > 0 &&
    recommendation.currentStack !== undefined &&
    recommendation.moneyOnTheTableBrl !== undefined
      ? {
          stack: recommendation.currentStack,
          moneyOnTheTableBrl: recommendation.moneyOnTheTableBrl,
        }
      : null;

  return (
    <main className="results-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <header className="max-w-4xl">
          <h1 className="results-display text-[clamp(2rem,4.6vw,3.45rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Stack recomendado: {stackLabel(topStack)}
          </h1>
        </header>

        <section className="results-rule mt-10 grid grid-cols-1 gap-y-8 border-b border-t py-8 md:grid-cols-[1.45fr_1fr] md:gap-x-14 md:py-10">
          <div>
            <p className="results-num text-[clamp(3rem,7vw,4.8rem)] font-semibold leading-none text-[color:var(--accent)]">
              {formatBrl(topStack.yearOneNetValueBrl)}
            </p>
            <p className="mt-3 text-sm text-[color:var(--ink-faint)]">
              valor líquido estimado em 12 meses
            </p>
            {recommendation.isReturnDecisionTight ? (
              <p className="mt-5 border-l-2 border-amber-700/70 bg-amber-50/40 py-1 pl-3 pr-2 text-xs leading-relaxed text-amber-900">
                Decisão apertada: a diferença de retorno para o segundo lugar está abaixo de 10%.
              </p>
            ) : null}
          </div>
          <dl className="grid content-end gap-0 self-end text-sm">
            <div className="results-rule flex items-baseline justify-between border-b py-3">
              <dt className="text-[color:var(--ink-faint)]">Anuidade total</dt>
              <dd className="results-num font-semibold">
                {formatBrl(topStack.yearOneAnnualFeeBrl)}
              </dd>
            </div>
            {scoreLab ? (
              <>
                <div className="results-rule flex items-baseline justify-between border-b py-3">
                  <dt className="text-[color:var(--ink-faint)]">Custo FX/IOF</dt>
                  <dd className="results-num font-semibold">
                    {formatBrl(scoreLab.modeledAnnual.internationalCostBrl)}
                  </dd>
                </div>
                <div className="results-rule flex items-baseline justify-between border-b py-3">
                  <dt className="text-[color:var(--ink-faint)]">Score-lab</dt>
                  <dd className="results-num font-semibold">{scoreText(scoreLab.score)}</dd>
                </div>
              </>
            ) : null}
            <div className="results-rule flex items-baseline justify-between border-b py-3">
              <dt className="text-[color:var(--ink-faint)]">Liquidez</dt>
              <dd className="font-semibold text-[color:var(--ink)]">
                {LIQUIDITY_LABEL[topStack.liquidity]}
              </dd>
            </div>
            <div className="results-rule flex items-baseline justify-between border-b py-3">
              <dt className="text-[color:var(--ink-faint)]">Cartões no stack</dt>
              <dd className="results-num font-semibold">{cardsInUse(topStack).length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 py-3">
              <dt className="text-[color:var(--ink-faint)]">Investimento para acesso/isenção</dt>
              <dd className="results-num text-right font-semibold">
                {stackInvestmentRequirementLabel(topStack)}
              </dd>
            </div>
          </dl>
        </section>

        {scoreLab ? (
          <section aria-label="Auditoria score-lab" className="results-rule border-b py-8">
            <div className="grid gap-6 md:grid-cols-[1fr_1.3fr] md:items-start">
              <div>
                <h2 className="results-display text-xl font-semibold">Auditoria score-lab</h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                  Motor determinístico com PTAX {scoreLabMeta?.ptaxRate.toFixed(2) ?? "atual"},
                  comparando {scoreLabMeta?.evaluatedStacks.toLocaleString("pt-BR") ?? "os"} stacks.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[color:var(--ink-faint)]">Retorno bruto</dt>
                  <dd className="results-num mt-1 font-semibold text-[color:var(--ink)]">
                    {formatBrl(scoreLab.modeledAnnual.grossValueBrl)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ink-faint)]">Anuidade</dt>
                  <dd className="results-num mt-1 font-semibold text-[color:var(--ink)]">
                    {formatBrl(scoreLab.modeledAnnual.recurringAnnualFeeBrl)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ink-faint)]">FX/IOF</dt>
                  <dd className="results-num mt-1 font-semibold text-[color:var(--ink)]">
                    {formatBrl(scoreLab.modeledAnnual.internationalCostBrl)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[color:var(--ink-faint)]">Reliability</dt>
                  <dd className="results-num mt-1 font-semibold text-[color:var(--ink)]">
                    {scoreText(scoreLab.productReliabilityScore)}
                  </dd>
                </div>
              </dl>
            </div>
            {scoreLabMeta?.netReturnLeaderDiffers ? (
              <p className="mt-5 border-l-2 border-[color:var(--rule-strong)] py-1 pl-3 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                Maior retorno líquido isolado:{" "}
                <span className="font-semibold text-[color:var(--ink)]">
                  {stackLabel(scoreLabMeta.netReturnLeader)}
                </span>{" "}
                ({formatBrl(scoreLabMeta.netReturnLeader.yearOneNetValueBrl)}). O recomendado
                pondera retorno, condições, custo, objetivo, allocation, reliability e confiança de
                dados.
              </p>
            ) : null}
            {scoreLabMeta?.institutionalAlternative ? (
              <p className="mt-3 border-l-2 border-[color:var(--rule-strong)] py-1 pl-3 text-sm leading-relaxed text-[color:var(--ink-soft)]">
                Alternativa institucional próxima:{" "}
                <span className="font-semibold text-[color:var(--ink)]">
                  {stackLabel(scoreLabMeta.institutionalAlternative.stack)}
                </span>{" "}
                ({formatBrl(scoreLabMeta.institutionalAlternative.stack.yearOneNetValueBrl)}).
              </p>
            ) : null}
          </section>
        ) : null}

        <section
          className="results-rule grid grid-cols-1 border-b md:grid-cols-2"
          aria-label="Resumo do stack recomendado"
        >
          <article className="py-8 md:pr-10">
            <h2 className="results-display text-xl font-semibold">Como usar</h2>
            <ul className="mt-5 divide-y divide-[color:var(--rule)] text-sm">
              {cardsInUse(topStack).map((card) => {
                const alloc = topStack.allocation.find((entry) => entry.cardId === card.id);
                return (
                  <li
                    key={card.id}
                    className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-5"
                  >
                    <span className="font-semibold text-[color:var(--ink)]">{card.name}</span>
                    <span className="results-num text-[color:var(--ink-soft)]">
                      BRL {formatBrl(alloc?.monthlyDomesticBrl ?? 0)}
                    </span>
                    <span className="results-num text-[color:var(--ink-soft)]">
                      USD {formatUsd(alloc?.monthlyInternationalUsd ?? 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="results-rule border-t py-8 md:border-l md:border-t-0 md:pl-10">
            <h2 className="results-display text-xl font-semibold">Por que venceu</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[color:var(--ink-soft)]">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="results-rule mt-5 border-t pt-4 text-sm leading-relaxed text-[color:var(--ink-soft)]">
              Acessibilidade: {accessibilitySummary}
            </p>
          </article>
        </section>

        {currentComparison ? (
          <section aria-label="Comparar com stack atual" className="results-rule border-b py-8">
            <h2 className="results-display text-xl font-semibold">Comparar com stack atual</h2>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-soft)]">
              Você está deixando{" "}
              <span className="results-num font-semibold text-[color:var(--accent)]">
                {formatBrl(currentComparison.moneyOnTheTableBrl)}
              </span>{" "}
              por ano na mesa.
            </p>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Atual:{" "}
              <span className="results-num font-semibold text-[color:var(--ink)]">
                {formatBrl(currentComparison.stack.yearOneNetValueBrl)}
              </span>{" "}
              · Recomendado:{" "}
              <span className="results-num font-semibold text-[color:var(--ink)]">
                {formatBrl(topStack.yearOneNetValueBrl)}
              </span>
            </p>
          </section>
        ) : null}

        <section aria-label="Trade-offs por eixo" className="results-rule border-b py-8">
          <h2 className="results-display text-xl font-semibold">Trade-offs</h2>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            O eixo anuidade mostra custo anual, não retorno líquido.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="results-rule border-b text-[color:var(--ink-faint)]">
                  <th className="pb-2 pr-4 font-semibold">Eixo</th>
                  <th className="pb-2 pr-4 font-semibold">Stack vencedor</th>
                  <th className="pb-2 pr-4 font-semibold">Indicador</th>
                  <th className="pb-2 pr-4 font-semibold">Retorno líquido</th>
                  <th className="pb-2 pr-4 font-semibold">Anuidade</th>
                  <th className="pb-2 pr-4 font-semibold">Liquidez</th>
                  <th className="pb-2 font-semibold">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.leaderboardsByAxis.map((axis) => {
                  const leader = axis.stacks[0];
                  if (!leader) return null;
                  const deltaVsTop = leader.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
                  return (
                    <tr key={axis.axisId} className="results-rule border-b align-top">
                      <td className="py-3 pr-4 font-semibold text-[color:var(--ink)]">
                        {AXIS_LABEL[axis.axisId]}
                      </td>
                      <td className="py-3 pr-4 text-[color:var(--ink)]">{stackLabel(leader)}</td>
                      <td className="py-3 pr-4 text-[color:var(--ink-soft)]">
                        {axisMetric(axis.axisId, leader)}
                      </td>
                      <td className="results-num py-3 pr-4 text-[color:var(--ink)]">
                        {formatBrl(leader.yearOneNetValueBrl)}
                      </td>
                      <td className="results-num py-3 pr-4 text-[color:var(--ink)]">
                        {formatBrl(leader.yearOneAnnualFeeBrl)}
                      </td>
                      <td className="py-3 pr-4 text-[color:var(--ink)]">
                        {LIQUIDITY_LABEL[leader.liquidity]}
                      </td>
                      <td className="results-num py-3 text-[color:var(--ink-soft)]">
                        {stackId(leader) === stackId(topStack)
                          ? "Recomendado"
                          : currencyDelta(deltaVsTop)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3">
            {recommendation.leaderboardsByAxis.map((axis) => {
              if (axis.stacks.length < 2) return null;
              return (
                <details key={`details-${axis.axisId}`} className="results-disclosure">
                  <summary>Outras opções no eixo {AXIS_LABEL[axis.axisId].toLowerCase()}</summary>
                  <ol className="results-rule mt-3 divide-y divide-[color:var(--rule)] border-t text-sm text-[color:var(--ink-soft)]">
                    {axis.stacks.slice(1, 4).map((stack, index) => (
                      <li
                        key={`${axis.axisId}-${stackId(stack)}`}
                        className="grid gap-1 py-3 sm:grid-cols-[40px_1fr_auto] sm:items-baseline sm:gap-3"
                      >
                        <span className="results-num text-xs text-[color:var(--ink-faint)]">
                          {String(index + 2).padStart(2, "0")}
                        </span>
                        <span className="text-[color:var(--ink)]">{stackLabel(stack)}</span>
                        <span className="results-num">{formatBrl(stack.yearOneNetValueBrl)}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <TravelTranslation translation={recommendation.travelTranslation} />
        </div>

        <footer className="results-rule mt-8 border-t pt-4">
          <Link to={ROUTES.INPUT} className="results-link text-sm font-medium">
            Ajustar dados
          </Link>
        </footer>
      </div>
    </main>
  );
};
