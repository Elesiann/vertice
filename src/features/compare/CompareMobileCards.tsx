import type { JSX, ReactNode } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { CardImage } from "@/components/domain/CardImage";
import { Badge } from "@/components/ui/Badge";
import { formatBrl } from "@/lib/format";
import { formatBankLabel } from "@/lib/labels";
import type { PublicCardDetail } from "@/types";

export interface MobileRow {
  label: string;
  cells: (string | JSX.Element)[];
  winners: Set<number>;
}

interface CompareMobileCardsProps {
  cards: PublicCardDetail[];
  rows: MobileRow[];
  winnerIndexes?: Set<number>;
  currentCardIds?: string[];
  cardDeltas?: (number | null)[];
  cardDeltaLabels?: string[];
  footer?: ReactNode;
}

export const CompareMobileCards = ({
  cards,
  rows,
  winnerIndexes = new Set<number>(),
  currentCardIds = [],
  cardDeltas = [],
  cardDeltaLabels = [],
  footer,
}: CompareMobileCardsProps): JSX.Element => (
  <div className="compare-mobile-cards flex flex-col gap-4 md:hidden">
    {cards.map((card, cardIdx) => {
      const isComparisonWinner = winnerIndexes.has(cardIdx);
      const delta = cardDeltas[cardIdx] ?? null;
      const deltaLabel = cardDeltaLabels[cardIdx] ?? "vs. vencedor";
      return (
        <section
          key={card.id}
          className={cn(
            "border-line bg-surface-raised rounded-lg border p-4",
            isComparisonWinner && "border-gold bg-gold-soft/35",
          )}
          aria-label={card.name}
        >
          <header className="flex items-start gap-3">
            <CardImage
              {...(card.imagePath !== undefined ? { imagePath: card.imagePath } : {})}
              name={card.name}
              brand={card.brand}
              tier={card.tier}
              size="sm"
              className="w-20 shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <Link
                to={`/cards/${card.id}`}
                className="text-subheading text-ink hover:text-accent block font-semibold"
              >
                {card.name}
              </Link>
              <p className="text-caption text-ink-subtle tracking-wide uppercase">
                {formatBankLabel(card.bank, card.id)} · {card.tier}
              </p>
              {isComparisonWinner ? (
                <Badge tone="gold" className="mt-2">
                  <Star size={11} aria-hidden />
                  Vencedor da comparação
                </Badge>
              ) : null}
              {currentCardIds.includes(card.id) ? (
                <p className="text-caption text-accent mt-1 tracking-normal normal-case">
                  Seu cartão hoje
                </p>
              ) : null}
              {delta !== null ? (
                <p
                  className={cn(
                    "tabular mt-1 text-xs",
                    delta >= 0 ? "text-gold" : "text-ink-subtle",
                  )}
                >
                  {delta >= 0 ? "+" : "-"}
                  {formatBrl(Math.abs(delta))} {deltaLabel}
                </p>
              ) : null}
            </div>
          </header>
          <dl className="divide-line mt-4 divide-y">
            {rows.map((row) => {
              const cell = row.cells[cardIdx];
              const isWinner = row.winners.has(cardIdx);
              return (
                <div
                  key={row.label}
                  className="text-body-sm grid grid-cols-[140px_1fr] items-start gap-3 py-2.5"
                >
                  <dt className="text-ink-muted">{row.label}</dt>
                  <dd
                    className={cn(
                      "text-right",
                      isWinner
                        ? "text-ink font-semibold"
                        : row.winners.size > 0
                          ? "text-ink-muted"
                          : "text-ink",
                    )}
                  >
                    {cell ?? "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      );
    })}
    {footer}
  </div>
);
