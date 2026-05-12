import { useState, type JSX } from "react";
import { cn } from "@/lib/cn";
import { AlternativesLadder } from "@/features/results/AlternativesLadder";
import {
  GAP_COLLAPSE_MIN,
  LADDER_BELOW_RECOMMENDED,
  TAB_DESCRIPTIONS,
  buildAlternativeLadder,
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
            </button>
          );
        })}
      </div>
      <p className="text-ink-subtle mt-3 text-xs leading-relaxed">
        {TAB_DESCRIPTIONS[activeTab.id]}
      </p>

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
    </section>
  );
};
