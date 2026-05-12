import { Fragment, type JSX } from "react";
import { Link } from "react-router-dom";
import { cardsInUse } from "@/features/results/alternatives";
import type { StackEvaluation } from "@/types";

export const HeroDetailLinks = ({ stack }: { stack: StackEvaluation }): JSX.Element | null => {
  const cards = cardsInUse(stack);
  if (cards.length === 0) return null;
  const [singleCard] = cards;
  if (cards.length === 1 && singleCard !== undefined) {
    return (
      <p className="mt-5">
        <Link to={`/cards/${singleCard.id}`} className="plain-link">
          Detalhes do cartão →
        </Link>
      </p>
    );
  }
  return (
    <p className="text-ink-muted mt-5 text-sm">
      <span className="text-ink-subtle">Detalhes: </span>
      {cards.map((card, i) => (
        <Fragment key={card.id}>
          {i > 0 ? <span className="text-ink-subtle"> · </span> : null}
          <Link to={`/cards/${card.id}`} className="plain-link">
            {card.name}
          </Link>
        </Fragment>
      ))}
    </p>
  );
};
