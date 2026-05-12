import { useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { AlternativesLadder } from "@/features/results/AlternativesLadder";
import { StackLabelLink } from "@/features/results/StackLabelLink";
import {
  GAP_COLLAPSE_MIN,
  LADDER_BELOW_RECOMMENDED,
  TAB_DESCRIPTIONS,
  buildAlternativeLadder,
  formatAnnualBrl,
  mostSimilarCompat,
  stackId,
  stackLabel,
  type AlternativeTab,
  type AlternativeTabId,
} from "@/features/results/alternatives";
import type { StackEvaluation } from "@/types";

export const AlternativesSection = ({
  tabs,
  topStack,
  currentStack,
  fullListHref,
}: {
  tabs: AlternativeTab[];
  topStack: StackEvaluation;
  currentStack?: StackEvaluation | undefined;
  fullListHref: string;
}): JSX.Element | null => {
  const [activeId, setActiveId] = useState<AlternativeTabId | null>(null);
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  if (activeTab === undefined) return null;

  const currentLabel = currentStack !== undefined ? stackLabel(currentStack) : null;
  const panelId = `alternatives-panel-${activeTab.id}`;
  const tabId = `alternatives-tab-${activeTab.id}`;
  const compatById =
    activeTab.id === "most-similar" ? mostSimilarCompat(activeTab.stacks, topStack) : null;

  return (
    <section className="border-line border-b py-8" aria-label="Outras escolhas">
      <h2 className="text-heading text-ink">Outras escolhas</h2>
      <div
        role="tablist"
        aria-label="Filtrar alternativas"
        className="border-line mt-6 flex flex-wrap gap-x-7 border-b"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`alternatives-panel-${tab.id}`}
              id={`alternatives-tab-${tab.id}`}
              onClick={() => {
                setActiveId(tab.id);
              }}
              className={cn(
                "text-caption focus-visible:ring-accent -mb-px cursor-pointer border-b-2 pb-3 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                isActive
                  ? "border-ink text-ink"
                  : "hover:text-ink text-ink-subtle border-transparent",
              )}
            >
              {tab.label}
              <span className="tabular text-ink-subtle ml-2 text-xs font-normal">
                {tab.stacks.length}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-ink-subtle mt-3 text-xs leading-relaxed">
        {TAB_DESCRIPTIONS[activeTab.id]}
      </p>

      {activeTab.id === "most-similar" ? (
        <ol
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId}
          className="divide-line mt-3 divide-y text-sm"
        >
          {activeTab.stacks.map((s) => (
            <li
              key={stackId(s)}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-3.5"
            >
              <span className="font-semibold">
                <StackLabelLink
                  stack={s}
                  cardClassName="text-ink"
                  separatorClassName="text-ink-subtle"
                />
              </span>
              <span className="text-num tabular text-ink font-semibold">
                {formatAnnualBrl(s.yearOneNetValueBrl)}
              </span>
              <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">
                {compatById?.get(stackId(s)) ?? 0}% compatível
              </p>
            </li>
          ))}
          <li className="pt-3.5">
            <Link to={fullListHref} className="plain-link">
              ver lista completa →
            </Link>
          </li>
        </ol>
      ) : (
        <AlternativesLadder
          rows={buildAlternativeLadder({
            pool: activeTab.stacks,
            topStack,
            currentStack,
            gapCollapseMin: GAP_COLLAPSE_MIN,
            belowRecommendedCount: LADDER_BELOW_RECOMMENDED,
          })}
          currentLabel={currentLabel}
          fullListHref={fullListHref}
          panelId={panelId}
          labelledById={tabId}
        />
      )}
    </section>
  );
};
