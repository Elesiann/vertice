import type { JSX } from "react";
import { Link } from "react-router-dom";
import { ShoutoutLine } from "@/components/domain/ShoutoutLine";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useSession } from "@/context/SessionContext";
import { catalog } from "@/data/catalog";
import { useRecommendation } from "@/hooks/useRecommendation";
import { formatBrl } from "@/lib/format";
import { ROUTES } from "@/routes";
import type { LeaderboardAxisId, StackEvaluation } from "@/types";

const AXIS_SHORT_LABEL: Record<LeaderboardAxisId, string> = {
  "net-return": "Retorno",
  liquidity: "Liquidez",
  "annual-fee": "Anuidade",
  simplicity: "Simplicidade",
  accessibility: "Acessibilidade",
};

const AXIS_DESCRIPTION: Record<LeaderboardAxisId, string> = {
  "net-return": "Maior valor líquido anual, já descontando anuidade.",
  liquidity: "Programas mais fáceis de usar e resgatar no dia a dia.",
  "annual-fee": "Menor custo anual total para manter o stack ativo.",
  simplicity: "Menos fricção operacional para usar sem microgerenciar.",
  accessibility:
    "Stack viável sem precisar abrir conta em banco específico ou ter alto investimento.",
};

const RELATIONSHIP_LABEL: Record<
  NonNullable<StackEvaluation["cards"][number]["requiresRelationship"]>,
  string
> = {
  open: "aberto",
  checking: "exige correntista",
  investment: "exige investimentos",
  private: "private banking",
};

const LIQUIDITY_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const stackId = (stack: StackEvaluation): string =>
  (stack.cards.filter((card) => {
    const alloc = stack.allocation.find((item) => item.cardId === card.id);
    const hasAllocatedSpend =
      alloc !== undefined && (alloc.monthlyDomesticBrl > 0 || alloc.monthlyInternationalUsd > 0);
    const baseYearOneFee = card.firstYearAnnualFeeBrl ?? card.annualFeeBrl;
    return hasAllocatedSpend || baseYearOneFee > 0;
  }).length > 0
    ? stack.cards.filter((card) => {
        const alloc = stack.allocation.find((item) => item.cardId === card.id);
        const hasAllocatedSpend =
          alloc !== undefined &&
          (alloc.monthlyDomesticBrl > 0 || alloc.monthlyInternationalUsd > 0);
        const baseYearOneFee = card.firstYearAnnualFeeBrl ?? card.annualFeeBrl;
        return hasAllocatedSpend || baseYearOneFee > 0;
      })
    : stack.cards
  )
    .map((card) => card.id)
    .slice()
    .sort()
    .join("|");

const stackLabel = (stack: StackEvaluation): string =>
  stack.cards.map((card) => card.name).join(" + ");

const stackLiquidity = (stack: StackEvaluation): "high" | "medium" | "low" => {
  const byProgram = new Map(catalog.programs.map((program) => [program.id, program.liquidity]));
  return stack.cards.reduce<"high" | "medium" | "low">((worst, card) => {
    const current = byProgram.get(card.pointsProgram) ?? "low";
    if (worst === "low" || current === "low") return "low";
    if (worst === "medium" || current === "medium") return "medium";
    return "high";
  }, "high");
};

const stackAlsoLeadsText = (
  stack: StackEvaluation,
  axisId: LeaderboardAxisId,
  winnerAxesByStack: Map<string, LeaderboardAxisId[]>,
): string | null => {
  const key = stackId(stack);
  const winnerAxes = winnerAxesByStack.get(key) ?? [];
  const alsoLeads = winnerAxes
    .filter((otherAxis) => otherAxis !== axisId)
    .map((otherAxis) => AXIS_SHORT_LABEL[otherAxis]);
  if (alsoLeads.length === 0) return null;
  return `Também lidera: ${alsoLeads.join(", ")}`;
};

const axisValueLabel = (axisId: LeaderboardAxisId): string => {
  if (axisId === "annual-fee") return "Anuidade deste stack";
  if (axisId === "liquidity") return "Retorno com este nível de liquidez";
  if (axisId === "simplicity") return "Retorno no stack mais simples";
  if (axisId === "accessibility") return "Retorno do stack mais acessível";
  return "Retorno líquido deste stack";
};

const stackAccessibilityLabel = (stack: StackEvaluation): string => {
  const levels = stack.cards
    .map((card) => card.requiresRelationship ?? "checking")
    .map((level) => RELATIONSHIP_LABEL[level]);
  return Array.from(new Set(levels)).join(" + ");
};

const axisLeaderReason = (
  axisId: LeaderboardAxisId,
  leader: StackEvaluation,
  runnerUp: StackEvaluation | undefined,
): string => {
  if (axisId === "net-return") {
    if (!runnerUp) return "Lidera retorno líquido sem concorrente próximo no recorte atual.";
    const delta = leader.yearOneNetValueBrl - runnerUp.yearOneNetValueBrl;
    return `Abre ${formatBrl(delta)} de vantagem sobre a próxima opção neste eixo.`;
  }
  if (axisId === "liquidity") {
    return "Prioriza programas com resgate mais simples e previsível.";
  }
  if (axisId === "annual-fee") {
    return `Mantém custo anual em ${formatBrl(leader.yearOneAnnualFeeBrl)} sem perder competitividade de retorno.`;
  }
  if (axisId === "accessibility") {
    return `Stack ${stackAccessibilityLabel(leader)} — não exige correntista nem investimento mínimo no banco emissor.`;
  }
  const cardCount = leader.cards.length;
  const noun = cardCount > 1 ? "cartões" : "cartão";
  return `Opera com ${String(cardCount)} ${noun} para reduzir fricção no uso diário.`;
};

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();

  if (profile === null) {
    return (
      <div className="results-page mx-auto max-w-3xl space-y-5 px-6 py-16 text-center">
        <p className="results-eyebrow">Stackr</p>
        <h1 className="results-display text-3xl font-semibold leading-tight">
          Nada pra mostrar ainda
        </h1>
        <p className="text-[color:var(--ink-soft)]">Preencha seus dados primeiro.</p>
        <div>
          <ButtonLink to={ROUTES.INPUT}>Ir pro formulário →</ButtonLink>
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="results-page mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-[color:var(--ink-faint)]">Calculando…</p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="results-page mx-auto max-w-3xl space-y-5 px-6 py-16 text-center">
        <p className="results-eyebrow">Stackr</p>
        <h1 className="results-display text-3xl font-semibold leading-tight">
          Não conseguimos recomendar
        </h1>
        <p className="text-[color:var(--ink-soft)]">{result.error.message}</p>
        <div>
          <Link to={ROUTES.INPUT} className="results-link text-sm font-medium">
            ← Voltar e ajustar os dados
          </Link>
        </div>
      </div>
    );
  }

  const recommendation = result.value;
  const winnerAxesByStack = new Map<string, LeaderboardAxisId[]>();
  for (const axis of recommendation.leaderboardsByAxis) {
    const winner = axis.stacks[0];
    if (!winner) continue;
    const key = stackId(winner);
    const previous = winnerAxesByStack.get(key) ?? [];
    winnerAxesByStack.set(key, [...previous, axis.axisId]);
  }

  const hasCurrentComparison =
    (profile.currentCardIds?.length ?? 0) > 0 &&
    recommendation.currentStack !== undefined &&
    recommendation.moneyOnTheTableBrl !== undefined;
  const netReturnAxis = recommendation.leaderboardsByAxis.find(
    (axis) => axis.axisId === "net-return",
  );
  const topReturnStack = netReturnAxis?.stacks[0];

  return (
    <div className="results-page mx-auto max-w-5xl px-6 py-10 md:py-14 lg:px-10">
      <header className="max-w-3xl">
        <p className="results-eyebrow">Análise · seu perfil</p>
        <h1 className="results-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
          Quatro recortes.
          <br />
          <span className="text-[color:var(--ink-faint)]">Um stack para cada decisão.</span>
        </h1>
        <p className="mt-5 max-w-[58ch] text-[0.98rem] leading-relaxed text-[color:var(--ink-soft)]">
          Em vez de eleger um vencedor único, mostramos o stack líder em cada eixo — retorno
          líquido, liquidez de resgate, custo anual e simplicidade operacional — para que a decisão
          seja sua.
        </p>
      </header>

      {topReturnStack ? (
        <section className="results-rule mt-12 grid grid-cols-1 gap-y-8 border-b border-t py-10 md:grid-cols-[1.5fr_1fr] md:gap-x-14 md:py-12">
          <div>
            <p className="results-eyebrow">Líder em retorno líquido</p>
            <p className="results-display mt-3 text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold leading-[1.2]">
              {stackLabel(topReturnStack)}
            </p>
            <p className="results-num mt-7 text-[clamp(2.8rem,7vw,4.6rem)] font-semibold leading-none">
              {formatBrl(topReturnStack.yearOneNetValueBrl)}
            </p>
            <p className="mt-3 text-sm text-[color:var(--ink-faint)]">
              valor líquido estimado · 12 meses
            </p>
            {recommendation.isReturnDecisionTight ? (
              <p className="mt-6 inline-block border-l-2 border-amber-700/70 bg-amber-50/40 py-1 pl-3 pr-2 text-xs leading-relaxed text-amber-900">
                Decisão apertada: a diferença para o segundo lugar fica abaixo de 10%. Olhe os
                outros eixos antes de decidir.
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-1 content-end gap-0 self-end text-sm">
            <div className="results-rule flex items-baseline justify-between border-b py-3">
              <dt className="text-[color:var(--ink-faint)]">Anuidade total</dt>
              <dd className="results-num font-semibold">
                {formatBrl(topReturnStack.yearOneAnnualFeeBrl)}
              </dd>
            </div>
            <div className="results-rule flex items-baseline justify-between border-b py-3">
              <dt className="text-[color:var(--ink-faint)]">Liquidez do stack</dt>
              <dd className="font-semibold text-[color:var(--ink)]">
                {LIQUIDITY_LABEL[stackLiquidity(topReturnStack)]}
              </dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-[color:var(--ink-faint)]">Cartões no stack</dt>
              <dd className="results-num font-semibold">{topReturnStack.cards.length}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section
        aria-label="Quadro de opções por eixo"
        className="mt-2 grid grid-cols-1 md:grid-cols-2"
      >
        {recommendation.leaderboardsByAxis.map((axis, idx) => {
          const leader = axis.stacks[0];
          const alsoLeads = leader
            ? stackAlsoLeadsText(leader, axis.axisId, winnerAxesByStack)
            : null;
          const borderClasses = [
            "results-rule px-0 py-8 md:px-8 md:py-10",
            idx > 0 ? "border-t" : "",
            idx % 2 === 1 ? "md:border-l" : "",
            idx >= 2 ? "md:border-t" : "md:border-t-0",
            idx === 1 ? "border-t md:border-t-0" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <article key={axis.axisId} className={borderClasses}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="results-eyebrow">
                  <span className="results-num mr-2 text-[color:var(--ink-faint)]">0{idx + 1}</span>
                  {AXIS_SHORT_LABEL[axis.axisId]}
                </p>
                {alsoLeads ? <span className="results-pill">{alsoLeads}</span> : null}
              </div>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--ink-soft)]">
                {AXIS_DESCRIPTION[axis.axisId]}
              </p>
              {leader ? (
                <>
                  <p className="results-display mt-6 text-[1.05rem] font-semibold leading-snug">
                    {stackLabel(leader)}
                  </p>
                  <div className="mt-4 flex items-baseline gap-3">
                    <p className="results-num text-[clamp(1.7rem,3vw,2.3rem)] font-semibold leading-none">
                      {formatBrl(leader.yearOneNetValueBrl)}
                    </p>
                  </div>
                  <p className="mt-1 text-[0.7rem] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                    {axisValueLabel(axis.axisId)}
                  </p>
                  <p className="mt-4 max-w-[44ch] text-[0.88rem] leading-relaxed text-[color:var(--ink-soft)]">
                    {axisLeaderReason(axis.axisId, leader, axis.stacks[1])}
                  </p>
                  <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-xs">
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-[color:var(--ink-faint)]">Anuidade</dt>
                      <dd className="results-num font-semibold">
                        {formatBrl(leader.yearOneAnnualFeeBrl)}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-[color:var(--ink-faint)]">Liquidez</dt>
                      <dd className="font-semibold text-[color:var(--ink)]">
                        {LIQUIDITY_LABEL[stackLiquidity(leader)]}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-[color:var(--ink-faint)]">Cartões</dt>
                      <dd className="results-num font-semibold">{leader.cards.length}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
              {axis.stacks.length > 1 ? (
                <details className="results-disclosure mt-6">
                  <summary>Outras opções neste eixo</summary>
                  <ol className="results-rule mt-4 divide-y divide-[color:var(--rule)] border-t">
                    {axis.stacks.slice(1, 3).map((stack, i) => (
                      <li
                        key={`${axis.axisId}-${stackId(stack)}`}
                        className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 py-3 text-sm"
                      >
                        <span className="results-num text-[0.7rem] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                          0{i + 2}
                        </span>
                        <span className="text-[color:var(--ink)]">{stackLabel(stack)}</span>
                        <span className="results-num font-semibold">
                          {formatBrl(stack.yearOneNetValueBrl)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="mt-14">
        <TravelTranslation translation={recommendation.travelTranslation} />
      </div>

      {hasCurrentComparison ? (
        <section
          aria-label="Comparar com meus cartões atuais"
          className="results-rule mt-12 border-t pt-10"
        >
          <p className="results-eyebrow">Versus seu stack atual</p>
          <p className="results-display mt-4 text-[clamp(1.35rem,2.4vw,1.75rem)] font-semibold leading-snug">
            Você está deixando{" "}
            <span className="results-num text-[color:var(--accent)]">
              {formatBrl(recommendation.moneyOnTheTableBrl)}
            </span>{" "}
            por ano na mesa.
          </p>
          <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
            Atual:{" "}
            <span className="results-num">
              {formatBrl(recommendation.currentStack.yearOneNetValueBrl)}
            </span>{" "}
            · Sugerido:{" "}
            <span className="results-num text-[color:var(--ink)]">
              {formatBrl(recommendation.topStack.yearOneNetValueBrl)}
            </span>{" "}
            (líquido / 12 meses)
          </p>
        </section>
      ) : null}

      <div className="mt-14 max-w-2xl">
        <ShoutoutLine text={recommendation.shoutout} />
      </div>

      <div className="results-rule mt-12 flex items-center justify-between border-t pt-6">
        <Link to={ROUTES.INPUT} className="results-link text-sm font-medium">
          ← Ajustar dados
        </Link>
        <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
          Stackr · análise por eixos
        </p>
      </div>
    </div>
  );
};
