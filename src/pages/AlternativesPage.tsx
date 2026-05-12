import { useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";
import { formatBrl } from "@/lib/format";
import { ROUTES } from "@/lib/routes-constants";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { StackLabelLink } from "@/features/results/StackLabelLink";
import {
  TAB_DESCRIPTIONS,
  buildAlternativesFullList,
  currentCardIsBest,
  formatAnnualBrl,
  isAccessibleForProfile,
  stackAccessBarrierLabel,
  stackId,
  type AlternativeTabId,
  type FullListRow,
} from "@/features/results/alternatives";
import type { SpendingProfile } from "@/types";

const RECOMMENDED_ROW_BG = "bg-line/35";
const CURRENT_ROW_BG = "bg-line/20";

const FILTERS: { id: AlternativeTabId; label: string }[] = [
  { id: "highest-return", label: "Maior retorno" },
  { id: "lowest-barrier", label: "Menor barreira" },
];

const filterTest = (
  id: AlternativeTabId,
  profile: SpendingProfile,
): ((row: FullListRow) => boolean) =>
  id === "lowest-barrier" ? (row) => isAccessibleForProfile(profile, row.stack) : () => true;

const AlternativesPageInner = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();
  const [filterId, setFilterId] = useState<AlternativeTabId>("highest-return");

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
          <Panel className="text-ink-muted p-6 text-center sm:p-8">Calculando…</Panel>
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

  const anchoredOnCurrentCard = currentCardIsBest(result.value, profile);
  const anchorStack =
    anchoredOnCurrentCard && result.value.currentStack !== undefined
      ? result.value.currentStack
      : undefined;
  const rows = buildAlternativesFullList(
    result.value,
    anchorStack !== undefined ? { anchorStack } : {},
  );
  const total = rows.length;
  const anchorWord = anchoredOnCurrentCard ? "seu cartão atual" : "recomendado";
  const test = filterTest(filterId, profile);
  const visible = rows.filter((r) => r.isRecommended || r.isCurrent || test(r));

  return (
    <main className="bg-surface text-ink-muted min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 md:py-12">
        <p className="text-caption text-ink-subtle">Todas as opções</p>
        <h1 className="text-display-3 text-ink mt-2">Catálogo comparado para o seu perfil</h1>
        <p className="text-ink-subtle mt-2 text-sm">
          {total} {total === 1 ? "cartão avaliado" : "cartões avaliados"}, ordenados por líquido
          anual.
        </p>

        <div
          role="tablist"
          aria-label="Filtrar cartões"
          className="border-line mt-6 flex flex-wrap gap-x-7 border-b"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={f.id === filterId}
              onClick={() => {
                setFilterId(f.id);
              }}
              className={cn(
                "text-caption focus-visible:ring-accent -mb-px cursor-pointer border-b-2 pb-3 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                f.id === filterId
                  ? "border-ink text-ink"
                  : "hover:text-ink text-ink-subtle border-transparent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-ink-subtle mt-3 text-xs leading-relaxed">{TAB_DESCRIPTIONS[filterId]}</p>

        <ol className="divide-line mt-3 divide-y text-sm">
          {visible.map((row) => {
            const barrier = stackAccessBarrierLabel(row.stack);
            const rowBg = row.isRecommended
              ? RECOMMENDED_ROW_BG
              : row.isCurrent
                ? CURRENT_ROW_BG
                : "";
            const above = row.deltaBrl > 0.01;
            const deltaText = row.isRecommended
              ? anchoredOnCurrentCard
                ? "seu cartão hoje · maior líquido sem investir mais"
                : "recomendado · maior líquido sem barreira"
              : above
                ? `+${formatBrl(row.deltaBrl)} vs ${anchorWord}`
                : row.deltaBrl < -0.01
                  ? `−${formatBrl(Math.abs(row.deltaBrl))} vs ${anchorWord}`
                  : `mesmo retorno do ${anchorWord}`;
            return (
              <li
                key={stackId(row.stack)}
                className={cn(
                  "grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-4 gap-y-1 px-3 py-3.5",
                  rowBg !== "" && `${rowBg} rounded-sm`,
                )}
              >
                <span className="text-ink-subtle tabular text-xs">{row.rank}</span>
                <span className="font-semibold">
                  {row.isRecommended ? <span aria-hidden>★ </span> : null}
                  <StackLabelLink
                    stack={row.stack}
                    cardClassName="text-ink"
                    separatorClassName="text-ink-subtle"
                  />
                </span>
                <span
                  className={cn(
                    "text-num tabular font-semibold",
                    above ? "text-warning" : "text-ink",
                  )}
                >
                  {formatAnnualBrl(row.stack.yearOneNetValueBrl)}
                </span>
                <p className="text-ink-subtle col-span-3 pl-12 text-xs leading-relaxed">
                  {row.isCurrent && !(anchoredOnCurrentCard && row.isRecommended)
                    ? "seu cartão hoje · "
                    : null}
                  <span className={cn("tabular", above ? "text-warning" : "text-ink-subtle")}>
                    {deltaText}
                  </span>
                  {barrier !== null ? (
                    <>
                      <span aria-hidden className="text-ink-subtle/60 mx-2">
                        ·
                      </span>
                      <span className="text-warning">{barrier}</span>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>

        <footer className="border-line mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <Link to={ROUTES.RESULTS} className="plain-link">
            ← Voltar para a recomendação
          </Link>
        </footer>
      </div>
    </main>
  );
};

export const AlternativesPage = (): JSX.Element => (
  <ErrorBoundary>
    <AlternativesPageInner />
  </ErrorBoundary>
);
