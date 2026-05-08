import type { JSX } from "react";
import { CardArt } from "@/components/domain/CardArt";
import { Button } from "@/components/ui/Button";
import { useCompareStore } from "@/lib/compare-store";
import type { PublicCardDetail } from "@/types";

interface CardDetailHeroProps {
  card: PublicCardDetail;
}

export const CardDetailHero = ({ card }: CardDetailHeroProps): JSX.Element => {
  const { add, remove, has } = useCompareStore();
  const inCompare = has(card.id);

  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row">
      <CardArt brand={card.brand} tier={card.tier} bank={card.bank} size="md" />
      <div className="flex flex-col gap-2">
        <h1 className="text-display-3 text-ink">{card.name}</h1>
        <p className="text-caption text-ink-subtle tracking-wide uppercase">
          {card.bank} · {card.tier} · {card.brand}
        </p>
        <Button
          variant={inCompare ? "secondary" : "primary"}
          size="sm"
          onClick={() => {
            if (inCompare) {
              remove(card.id);
            } else {
              add(card.id);
            }
          }}
        >
          {inCompare ? "Remover da comparação" : "Adicionar à comparação"}
        </Button>
      </div>
    </div>
  );
};
