import type { JSX } from "react";
import { Link } from "react-router-dom";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
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

const VERDICT_TONE: Record<"strong" | "viable" | "negative", string> = {
  strong: "text-accent",
  viable: "text-ink",
  negative: "text-warning",
};

const PTAX_SOURCE_LABEL: Record<"awesomeapi" | "fallback" | "manual", string> = {
  awesomeapi: "ao vivo",
  fallback: "fallback",
  manual: "manual",
};

const formatRoiMultiple = (value: number): string => `${value.toFixed(2).replace(".", ",")}x`;

const formatPtaxFetchedAt = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();

  if (profile === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-display-3 text-ink">Nada para mostrar ainda</h1>
            <p className="text-ink-muted text-sm">Preencha seus dados para gerar a recomendação.</p>
            <div>
              <ButtonLink to={ROUTES.INPUT}>Ir para o formulário</ButtonLink>
            </div>
          </Panel>
        </div>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="text-ink-muted p-6 text-center sm:p-8">
            Calculando recomendação...
          </Panel>
        </div>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-display-3 text-ink">Não conseguimos recomendar</h1>
            <p className="text-ink-muted text-sm">{result.error.message}</p>
            <div>
              <Link to={ROUTES.INPUT} className="plain-link">
                Voltar e ajustar os dados
              </Link>
            </div>
          </Panel>
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
    <main className="bg-surface text-ink-muted min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <header className="max-w-4xl">
          <h1 className="text-display-2 text-ink">Stack recomendado: {stackLabel(topStack)}</h1>
          {scoreLab?.verdict ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed">
              <span className={`font-semibold ${VERDICT_TONE[scoreLab.verdict.kind]}`}>
                {scoreLab.verdict.label}.
              </span>{" "}
              <span className="text-ink-muted">{scoreLab.verdict.detail}</span>
            </p>
          ) : null}
        </header>

        <section className="border-line mt-10 grid grid-cols-1 gap-y-8 border-t border-b py-8 md:grid-cols-[1.45fr_1fr] md:gap-x-14 md:py-10">
          <div>
            <p className="text-kpi text-accent">{formatBrl(topStack.yearOneNetValueBrl)}</p>
            <p className="text-ink-subtle mt-3 text-sm">valor líquido estimado em 12 meses</p>
            {recommendation.isReturnDecisionTight ? (
              <p className="border-warning/70 bg-warning-soft/40 text-warning mt-5 border-l-2 py-1 pr-2 pl-3 text-xs leading-relaxed">
                Decisão apertada: a diferença de retorno para o segundo lugar está abaixo de 10%.
              </p>
            ) : null}
          </div>
          <dl className="grid content-end gap-0 self-end text-sm">
            <Stat
              label="Anuidade total"
              value={formatBrl(topStack.yearOneAnnualFeeBrl)}
              labelClassName="text-ink-subtle"
              className="border-line border-b py-3"
            />
            {scoreLab ? (
              <>
                <Stat
                  label="Custo FX/IOF"
                  value={formatBrl(scoreLab.modeledAnnual.internationalCostBrl)}
                  labelClassName="text-ink-subtle"
                  className="border-line border-b py-3"
                />
                {scoreLab.modeledAnnual.benefitUtilityBrl > 0 ? (
                  <Stat
                    label="Benefício de viagem"
                    value={formatBrl(scoreLab.modeledAnnual.benefitUtilityBrl)}
                    labelClassName="text-ink-subtle"
                    className="border-line border-b py-3"
                  />
                ) : null}
                <Stat
                  label="Score-lab"
                  value={scoreText(scoreLab.score)}
                  labelClassName="text-ink-subtle"
                  className="border-line border-b py-3"
                />
                {scoreLab.breakEvenMonthlySpendBrl !== null ? (
                  <Stat
                    label="Break-even mensal"
                    value={formatBrl(scoreLab.breakEvenMonthlySpendBrl)}
                    labelClassName="text-ink-subtle"
                    className="border-line border-b py-3"
                  />
                ) : null}
                {scoreLab.roiMultiple !== null ? (
                  <Stat
                    label="ROI sobre anuidade"
                    value={formatRoiMultiple(scoreLab.roiMultiple)}
                    labelClassName="text-ink-subtle"
                    className="border-line border-b py-3"
                  />
                ) : null}
              </>
            ) : null}
            <Stat
              label="Liquidez"
              value={LIQUIDITY_LABEL[topStack.liquidity]}
              labelClassName="text-ink-subtle"
              valueClassName="text-ink font-semibold"
              className="border-line border-b py-3"
            />
            <Stat
              label="Cartões no stack"
              value={cardsInUse(topStack).length}
              labelClassName="text-ink-subtle"
              className="border-line border-b py-3"
            />
            <Stat
              label="Investimento para acesso/isenção"
              value={stackInvestmentRequirementLabel(topStack)}
              labelClassName="text-ink-subtle"
              valueClassName="text-num text-ink text-right font-semibold"
              className="py-3"
            />
          </dl>
        </section>

        {scoreLab ? (
          <section aria-label="Auditoria score-lab" className="border-line border-b py-8">
            <div className="grid gap-6 md:grid-cols-[1fr_1.3fr] md:items-start">
              <div>
                <h2 className="text-heading text-ink">Auditoria score-lab</h2>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  Motor determinístico com PTAX{" "}
                  <span className="text-num text-ink font-semibold">
                    {scoreLabMeta?.ptaxRate.toFixed(2) ?? "atual"}
                  </span>
                  {scoreLabMeta ? (
                    <>
                      {" "}
                      ({PTAX_SOURCE_LABEL[scoreLabMeta.ptaxSource]}
                      {scoreLabMeta.ptaxSource === "awesomeapi" &&
                      formatPtaxFetchedAt(scoreLabMeta.ptaxFetchedAt) !== ""
                        ? `, ${formatPtaxFetchedAt(scoreLabMeta.ptaxFetchedAt)}`
                        : null}
                      )
                    </>
                  ) : null}
                  , comparando {scoreLabMeta?.evaluatedStacks.toLocaleString("pt-BR") ?? "os"}{" "}
                  stacks.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-5">
                <Stat
                  block
                  label="Retorno bruto"
                  value={formatBrl(scoreLab.modeledAnnual.grossValueBrl)}
                  labelClassName="text-ink-subtle"
                />
                <Stat
                  block
                  label="Anuidade"
                  value={formatBrl(scoreLab.modeledAnnual.recurringAnnualFeeBrl)}
                  labelClassName="text-ink-subtle"
                />
                <Stat
                  block
                  label="FX/IOF"
                  value={formatBrl(scoreLab.modeledAnnual.internationalCostBrl)}
                  labelClassName="text-ink-subtle"
                />
                <Stat
                  block
                  label="Benefício viagem"
                  value={formatBrl(scoreLab.modeledAnnual.benefitUtilityBrl)}
                  labelClassName="text-ink-subtle"
                />
                <Stat
                  block
                  label="Reliability"
                  value={scoreText(scoreLab.productReliabilityScore)}
                  labelClassName="text-ink-subtle"
                />
              </dl>
            </div>
            {scoreLabMeta?.netReturnLeaderDiffers ? (
              <p className="border-line-strong text-ink-muted mt-5 border-l-2 py-1 pl-3 text-sm leading-relaxed">
                Maior retorno líquido isolado:{" "}
                <span className="text-ink font-semibold">
                  {stackLabel(scoreLabMeta.netReturnLeader)}
                </span>{" "}
                ({formatBrl(scoreLabMeta.netReturnLeader.yearOneNetValueBrl)}). O recomendado
                pondera retorno, condições, custo, objetivo, allocation, reliability e confiança de
                dados.
              </p>
            ) : null}
            {scoreLabMeta?.institutionalAlternative ? (
              <p className="border-line-strong text-ink-muted mt-3 border-l-2 py-1 pl-3 text-sm leading-relaxed">
                Alternativa institucional próxima:{" "}
                <span className="text-ink font-semibold">
                  {stackLabel(scoreLabMeta.institutionalAlternative.stack)}
                </span>{" "}
                ({formatBrl(scoreLabMeta.institutionalAlternative.stack.yearOneNetValueBrl)}).
              </p>
            ) : null}
          </section>
        ) : null}

        <section
          className="border-line grid grid-cols-1 border-b md:grid-cols-2"
          aria-label="Resumo do stack recomendado"
        >
          <article className="py-8 md:pr-10">
            <h2 className="text-heading text-ink">Como usar</h2>
            <ul className="divide-line mt-5 divide-y text-sm">
              {cardsInUse(topStack).map((card) => {
                const alloc = topStack.allocation.find((entry) => entry.cardId === card.id);
                return (
                  <li
                    key={card.id}
                    className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-5"
                  >
                    <span className="text-ink font-semibold">{card.name}</span>
                    <span className="text-num text-ink-muted">
                      BRL {formatBrl(alloc?.monthlyDomesticBrl ?? 0)}
                    </span>
                    <span className="text-num text-ink-muted">
                      USD {formatUsd(alloc?.monthlyInternationalUsd ?? 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="border-line border-t py-8 md:border-t-0 md:border-l md:pl-10">
            <h2 className="text-heading text-ink">Por que venceu</h2>
            <ul className="text-ink-muted mt-5 space-y-3 text-sm leading-relaxed">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <p className="border-line text-ink-muted mt-5 border-t pt-4 text-sm leading-relaxed">
              Acessibilidade: {accessibilitySummary}
            </p>
          </article>
        </section>

        {currentComparison ? (
          <section aria-label="Comparar com stack atual" className="border-line border-b py-8">
            <h2 className="text-heading text-ink">Comparar com stack atual</h2>
            <p className="text-ink-muted mt-4 text-sm leading-relaxed">
              Você está deixando{" "}
              <span className="text-num text-accent font-semibold">
                {formatBrl(currentComparison.moneyOnTheTableBrl)}
              </span>{" "}
              por ano na mesa.
            </p>
            <p className="text-ink-muted mt-2 text-sm">
              Atual:{" "}
              <span className="text-num text-ink font-semibold">
                {formatBrl(currentComparison.stack.yearOneNetValueBrl)}
              </span>{" "}
              · Recomendado:{" "}
              <span className="text-num text-ink font-semibold">
                {formatBrl(topStack.yearOneNetValueBrl)}
              </span>
            </p>
          </section>
        ) : null}

        <section aria-label="Trade-offs por eixo" className="border-line border-b py-8">
          <h2 className="text-heading text-ink">Trade-offs</h2>
          <p className="text-ink-muted mt-2 text-sm">
            O eixo anuidade mostra custo anual, não retorno líquido.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-line text-ink-subtle border-b">
                  <th className="pr-4 pb-2 font-semibold">Eixo</th>
                  <th className="pr-4 pb-2 font-semibold">Stack vencedor</th>
                  <th className="pr-4 pb-2 font-semibold">Indicador</th>
                  <th className="pr-4 pb-2 font-semibold">Retorno líquido</th>
                  <th className="pr-4 pb-2 font-semibold">Anuidade</th>
                  <th className="pr-4 pb-2 font-semibold">Liquidez</th>
                  <th className="pb-2 font-semibold">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.leaderboardsByAxis.map((axis) => {
                  const leader = axis.stacks[0];
                  if (!leader) return null;
                  const deltaVsTop = leader.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
                  return (
                    <tr key={axis.axisId} className="border-line border-b align-top">
                      <td className="text-ink py-3 pr-4 font-semibold">
                        {AXIS_LABEL[axis.axisId]}
                      </td>
                      <td className="text-ink py-3 pr-4">{stackLabel(leader)}</td>
                      <td className="text-ink-muted py-3 pr-4">
                        {axisMetric(axis.axisId, leader)}
                      </td>
                      <td className="text-num text-ink py-3 pr-4">
                        {formatBrl(leader.yearOneNetValueBrl)}
                      </td>
                      <td className="text-num text-ink py-3 pr-4">
                        {formatBrl(leader.yearOneAnnualFeeBrl)}
                      </td>
                      <td className="text-ink py-3 pr-4">{LIQUIDITY_LABEL[leader.liquidity]}</td>
                      <td className="text-num text-ink-muted py-3">
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
                <Disclosure
                  key={`details-${axis.axisId}`}
                  variant="inline"
                  summary={`Outras opções no eixo ${AXIS_LABEL[axis.axisId].toLowerCase()}`}
                >
                  <ol className="border-line divide-line text-ink-muted mt-3 divide-y border-t text-sm">
                    {axis.stacks.slice(1, 4).map((stack, index) => (
                      <li
                        key={`${axis.axisId}-${stackId(stack)}`}
                        className="grid gap-1 py-3 sm:grid-cols-[40px_1fr_auto] sm:items-baseline sm:gap-3"
                      >
                        <span className="text-num text-ink-subtle text-xs">
                          {String(index + 2).padStart(2, "0")}
                        </span>
                        <span className="text-ink">{stackLabel(stack)}</span>
                        <span className="text-num">{formatBrl(stack.yearOneNetValueBrl)}</span>
                      </li>
                    ))}
                  </ol>
                </Disclosure>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <TravelTranslation translation={recommendation.travelTranslation} />
        </div>

        <footer className="border-line mt-8 border-t pt-4">
          <Link to={ROUTES.INPUT} className="plain-link">
            Ajustar dados
          </Link>
        </footer>
      </div>
    </main>
  );
};
