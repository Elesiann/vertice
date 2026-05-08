import type { JSX } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardArt } from "@/components/domain/CardArt";
import { formatBrl } from "@/lib/format";
import type { PublicCatalogCard } from "@/types";

interface CatalogCardProps {
  card: PublicCatalogCard;
  onCompare?: (id: string) => void;
  inCompare?: boolean;
  className?: string;
}

export const CatalogCard = ({
  card,
  onCompare,
  inCompare = false,
  className,
}: CatalogCardProps): JSX.Element => (
  <article
    className={cn(
      "border-line bg-surface-raised flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md",
      className,
    )}
  >
    <Link
      to={`/cards/${card.id}`}
      className="focus-visible:ring-accent block rounded-lg focus:outline-none focus-visible:ring-2"
    >
      <CardArt brand={card.brand} tier={card.tier} bank={card.bank} size="sm" className="w-full" />
    </Link>
    <div className="flex flex-col gap-1">
      <Link
        to={`/cards/${card.id}`}
        className="text-subheading text-ink hover:text-accent focus-visible:ring-accent rounded font-semibold focus:outline-none focus-visible:ring-2"
      >
        {card.name}
      </Link>
      <p className="text-caption text-ink-subtle tracking-wide uppercase">
        {card.bank} · {card.tier}
      </p>
    </div>
    <p className="text-body-sm text-ink-muted">
      Anuidade: <span className="text-ink font-semibold">{formatBrl(card.annualFeeBrl)}</span>
    </p>
    <div className="flex flex-wrap gap-1">
      {card.hasLoungeAccess && <Badge tone="accent">Lounge</Badge>}
      {card.cashbackRatePercent !== undefined && card.cashbackRatePercent > 0 && (
        <Badge tone="neutral">Cashback {card.cashbackRatePercent}%</Badge>
      )}
      {card.annualFeeBrl === 0 && <Badge tone="neutral">Sem anuidade</Badge>}
    </div>
    <Button
      size="sm"
      variant={inCompare ? "secondary" : "ghost"}
      onClick={() => onCompare?.(card.id)}
    >
      {inCompare ? "Na comparação" : "Comparar"}
    </Button>
  </article>
);
