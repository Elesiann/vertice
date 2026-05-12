import { type JSX } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { formatBrl } from "@/lib/format";
import { StackLabelLink } from "@/features/results/StackLabelLink";
import {
  formatAnnualBrl,
  stackAccessBarrierLabel,
  stackId,
  type LadderRow,
} from "@/features/results/alternatives";
import type { StackEvaluation } from "@/types";

const RECOMMENDED_ROW_BG = "bg-line/35";
const CURRENT_ROW_BG = "bg-line/20";

const CardRow = ({
  stack,
  deltaBrl,
  anchoredOnCurrentCard,
}: {
  stack: StackEvaluation;
  deltaBrl: number;
  anchoredOnCurrentCard: boolean;
}): JSX.Element => {
  const above = deltaBrl > 0.01;
  const even = Math.abs(deltaBrl) <= 0.01;
  const anchorWord = anchoredOnCurrentCard ? "seu cartão atual" : "recomendado";
  const deltaText = even
    ? `mesmo retorno do ${anchorWord}`
    : above
      ? `+${formatBrl(deltaBrl)} vs ${anchorWord}`
      : `−${formatBrl(Math.abs(deltaBrl))} vs ${anchorWord}`;
  // Anchored on the current card, out-earning it is a genuine upside — paint the gain green and let
  // the investment barrier carry the "but…". Anchored on the recommended (= highest with no
  // barrier), a card above it is the catch itself, so it stays amber.
  const aboveTone = anchoredOnCurrentCard ? "text-accent" : "text-warning";
  const deltaTone = above ? aboveTone : "text-ink-subtle";
  const valueTone = above ? aboveTone : "text-ink";
  const barrier = stackAccessBarrierLabel(stack);
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 px-3 py-3.5">
      <span className="font-semibold">
        <StackLabelLink
          stack={stack}
          cardClassName="text-ink"
          separatorClassName="text-ink-subtle"
        />
      </span>
      <span className={cn("text-num tabular font-semibold", valueTone)}>
        {formatAnnualBrl(stack.yearOneNetValueBrl)}
      </span>
      <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">
        <span className={cn("tabular", deltaTone)}>{deltaText}</span>
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
};

export const AlternativesLadder = ({
  rows,
  currentLabel,
  anchoredOnCurrentCard = false,
  fullListHref,
  panelId,
  labelledById,
}: {
  rows: LadderRow[];
  currentLabel: string | null; // user's current card label, for the gap line; null when no current card
  anchoredOnCurrentCard?: boolean; // the ★ anchor row IS the user's current card (Estado B)
  fullListHref: string;
  panelId: string;
  labelledById: string;
}): JSX.Element => (
  <ol
    role="tabpanel"
    id={panelId}
    aria-labelledby={labelledById}
    className="divide-line mt-3 divide-y text-sm"
  >
    {rows.map((row) => {
      switch (row.kind) {
        case "recommended":
          return (
            <li
              key={stackId(row.stack)}
              className={cn(
                "grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 rounded-sm px-3 py-3.5",
                RECOMMENDED_ROW_BG,
              )}
            >
              <span className="font-semibold">
                <span aria-hidden>★ </span>
                <StackLabelLink
                  stack={row.stack}
                  cardClassName="text-ink"
                  separatorClassName="text-ink-subtle"
                />
              </span>
              <span className="text-num tabular text-ink font-semibold">
                {formatAnnualBrl(row.stack.yearOneNetValueBrl)}
              </span>
              <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">
                {anchoredOnCurrentCard
                  ? "seu cartão hoje · maior líquido sem investir mais"
                  : "recomendado · maior líquido sem barreira"}
              </p>
            </li>
          );
        case "gap":
          return (
            <li key="gap" className="text-ink-subtle px-3 py-3 text-xs leading-relaxed">
              {row.count} {row.count === 1 ? "cartão" : "cartões"} — abaixo do recomendado
              {currentLabel !== null ? `, acima do seu ${currentLabel}` : ""}.{" "}
              <Link to={fullListHref} className="plain-link">
                ver todos →
              </Link>
            </li>
          );
        case "current":
          return (
            <li
              key={stackId(row.stack)}
              className={cn(
                "grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 rounded-sm px-3 py-3.5",
                CURRENT_ROW_BG,
              )}
            >
              <span className="font-semibold">
                <StackLabelLink
                  stack={row.stack}
                  cardClassName="text-ink"
                  separatorClassName="text-ink-subtle"
                />
              </span>
              <span className="text-num tabular text-ink font-semibold">
                {formatAnnualBrl(row.stack.yearOneNetValueBrl)}
              </span>
              <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">
                seu cartão hoje
                <span aria-hidden className="text-ink-subtle/60 mx-2">
                  ·
                </span>
                <span className="tabular">−{formatBrl(Math.abs(row.deltaBrl))} vs recomendado</span>
              </p>
            </li>
          );
        case "card":
          return (
            <CardRow
              key={stackId(row.stack)}
              stack={row.stack}
              deltaBrl={row.deltaBrl}
              anchoredOnCurrentCard={anchoredOnCurrentCard}
            />
          );
      }
    })}
    <li className="px-3 pt-3.5">
      <Link to={fullListHref} className="plain-link">
        ver lista completa →
      </Link>
    </li>
  </ol>
);
