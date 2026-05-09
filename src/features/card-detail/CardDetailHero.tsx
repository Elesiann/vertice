import type { JSX } from "react";
import { CardArt } from "@/components/domain/CardArt";
import { VerifiedMark } from "@/components/domain/VerifiedMark";
import { Button } from "@/components/ui/Button";
import { useCompareStore } from "@/lib/compare-store";
import type { PublicCardDetail } from "@/types";

type PublicCardDetailWithVerificationSources = PublicCardDetail & {
  verifiedSources?: string[];
};

interface CardDetailHeroProps {
  card: PublicCardDetailWithVerificationSources;
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
        <VerifiedMark
          {...(card.lastVerified !== undefined ? { lastVerified: card.lastVerified } : {})}
          {...(card.verifiedTier !== undefined ? { verifiedTier: card.verifiedTier } : {})}
        />
        {card.verifiedSources !== undefined && card.verifiedSources.length > 0 ? (
          <div className="text-body-sm text-ink-muted">
            <p>Fontes:</p>
            <ul className="mt-1 flex flex-col gap-1">
              {card.verifiedSources.map((source) => (
                <li key={source}>
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="plain-link break-all"
                  >
                    {source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
