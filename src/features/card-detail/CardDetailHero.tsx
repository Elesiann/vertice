import type { JSX } from "react";
import { CardImage } from "@/components/domain/CardImage";
import { cn } from "@/lib/cn";
import { formatIsoDateBr } from "@/lib/format";
import {
  accessCopy,
  cardIssuerLine,
  effectiveFeeCopy,
  hasInternationalAngle,
  internationalCopy,
  returnCopy,
  VERIFIED_TIER_CRITERIA,
  VERIFIED_TIER_LABEL,
  type CopyTone,
  type DetailCopy,
} from "@/features/card-detail/detail-model";
import type { PublicCardDetail, SpendingProfile } from "@/types";

interface CardDetailHeroProps {
  card: PublicCardDetail;
  profile: SpendingProfile | null;
}

const TONE_CLASS: Record<CopyTone, string> = {
  accent: "text-accent",
  ink: "text-ink",
  muted: "text-ink-muted",
  warning: "text-warning",
};

// Lista vertical: o conteúdo de cada pergunta varia muito (de "Cashback" a
// "Sem relacionamento mínimo" + subline de três linhas), e o número de
// perguntas é 3 ou 4. Coluna estreita pro rótulo, coluna larga pro valor —
// qualquer comprimento cabe, e uma pergunta ausente é só uma linha a menos.
const HeroFact = ({ label, detail }: { label: string; detail: DetailCopy }): JSX.Element => {
  const tone = detail.tone ?? "ink";
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
      <dt className="text-ink-subtle text-xs">{label}</dt>
      <dd>
        <p className={cn("text-num tabular text-base font-semibold text-pretty", TONE_CLASS[tone])}>
          {detail.value}
        </p>
        {detail.note !== undefined && detail.note.length > 0 ? (
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed text-pretty",
              tone === "warning" ? "text-warning" : "text-ink-subtle",
            )}
          >
            {detail.note}
          </p>
        ) : null}
      </dd>
    </div>
  );
};

const MetaLine = ({ card }: { card: PublicCardDetail }): JSX.Element => {
  const date =
    card.lastVerified !== undefined
      ? formatIsoDateBr(card.lastVerified.split("T")[0] ?? card.lastVerified)
      : null;
  return (
    <p className="text-ink-subtle mt-3 text-xs">
      <span>{cardIssuerLine(card)}</span>
      {date !== null ? (
        <>
          <span aria-hidden> · </span>
          <span>Última checagem em {date}</span>
        </>
      ) : null}
      {card.verifiedTier !== undefined ? (
        <>
          <span aria-hidden> · </span>
          <span
            className="cursor-help underline decoration-dotted underline-offset-2"
            title={VERIFIED_TIER_CRITERIA[card.verifiedTier]}
          >
            {VERIFIED_TIER_LABEL[card.verifiedTier]}
          </span>
        </>
      ) : null}
    </p>
  );
};

export const CardDetailHero = ({ card, profile }: CardDetailHeroProps): JSX.Element => {
  const facts: { label: string; detail: DetailCopy }[] = [
    { label: "Exige?", detail: accessCopy(card) },
    { label: "Anuidade?", detail: effectiveFeeCopy(card, profile, { compact: true }) },
    { label: "Ganhos?", detail: returnCopy(card) },
  ];
  if (hasInternationalAngle(card)) {
    facts.push({ label: "Internacional", detail: internationalCopy(card) });
  }

  return (
    <header className="border-line border-b pb-8">
      <h1 className="text-display-2 text-ink text-balance">{card.name}</h1>
      <MetaLine card={card} />
      {/* Título e meta-line ocupam a largura inteira; abaixo, a lista de fatos
          fica ao lado do render do cartão, ambos alinhados pelo topo. A lista
          é alta o bastante (3-4 linhas) para o cartão não ficar pairando. */}
      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)] md:items-start md:gap-12">
        <dl className="flex max-w-2xl flex-col gap-y-5">
          {facts.map((fact) => (
            <HeroFact key={fact.label} label={fact.label} detail={fact.detail} />
          ))}
        </dl>
        <div className="flex justify-center md:justify-end">
          <CardImage
            {...(card.imagePath !== undefined ? { imagePath: card.imagePath } : {})}
            name={card.name}
            brand={card.brand}
            tier={card.tier}
            bank={card.bank}
            size="md"
            className="w-full max-w-[240px]"
            priority
          />
        </div>
      </div>
    </header>
  );
};
