import { Fragment, type JSX } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { StackEvaluation } from "@/types";
import { cardsInUse } from "@/features/results/alternatives";

export const StackLabelLink = ({
  stack,
  cardClassName,
  separatorClassName,
}: {
  stack: StackEvaluation;
  cardClassName?: string;
  separatorClassName?: string;
}): JSX.Element => {
  const cards = cardsInUse(stack);
  return (
    <>
      {cards.map((card, i) => (
        <Fragment key={card.id}>
          {i > 0 ? (
            <span aria-hidden className={cn("font-normal", separatorClassName)}>
              {" + "}
            </span>
          ) : null}
          <Link
            to={`/cards/${card.id}`}
            className={cn(
              "hover:text-accent focus-visible:text-accent focus-visible:outline-accent transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2",
              cardClassName,
            )}
          >
            {card.name}
          </Link>
        </Fragment>
      ))}
    </>
  );
};
