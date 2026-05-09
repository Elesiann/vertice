import type { JSX, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { CardArt } from "@/components/domain/CardArt";
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
  footer?: ReactNode;
}

export const CompareMobileCards = ({
  cards,
  rows,
  footer,
}: CompareMobileCardsProps): JSX.Element => (
  <div className="flex flex-col gap-4 md:hidden">
    {cards.map((card, cardIdx) => (
      <section
        key={card.id}
        className="border-line bg-surface-raised rounded-lg border p-4"
        aria-label={card.name}
      >
        <header className="flex items-start gap-3">
          <CardArt brand={card.brand} tier={card.tier} bank={card.bank} size="sm" />
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
                <dd className={cn("text-ink text-right", isWinner && "text-accent font-semibold")}>
                  {cell ?? "—"}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    ))}
    {footer}
  </div>
);
