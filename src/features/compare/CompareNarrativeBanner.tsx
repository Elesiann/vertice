import type { JSX } from "react";
import { useSession } from "@/context/SessionContext";
import { useModeledReturns } from "@/features/compare/useModeledReturns";
import { formatBrl } from "@/lib/format";
import type { PublicCardDetail } from "@/types";

interface CompareNarrativeBannerProps {
  cards: PublicCardDetail[];
}

interface RankedEntry {
  name: string;
  netReturn: number;
}

const buildSentences = (ranked: RankedEntry[], monthlyDomesticBrl: number): string[] => {
  if (ranked.length < 2) return [];
  const sentences: string[] = [];
  const [leader, second, third, fourth] = ranked;
  if (leader === undefined || second === undefined) return [];
  const gasto = formatBrl(monthlyDomesticBrl);
  const delta12 = leader.netReturn - second.netReturn;
  sentences.push(
    `Pro seu gasto de ${gasto}/mês, ${leader.name} rende ${formatBrl(delta12)}/ano a mais que ${second.name}.`,
  );
  if (third !== undefined) {
    const delta23 = second.netReturn - third.netReturn;
    sentences.push(`${third.name} fica ${formatBrl(delta23)} atrás de ${second.name}.`);
  }
  if (fourth !== undefined && third !== undefined) {
    const delta34 = third.netReturn - fourth.netReturn;
    sentences.push(`${fourth.name} fica ${formatBrl(delta34)} atrás de ${third.name}.`);
  }
  return sentences;
};

export const CompareNarrativeBanner = ({
  cards,
}: CompareNarrativeBannerProps): JSX.Element | null => {
  const { profile } = useSession();
  const modeled = useModeledReturns();

  if (profile === null) return null;
  if (modeled.status !== "ready") return null;
  if (cards.length < 2) return null;

  const ranked: RankedEntry[] = cards
    .reduce<RankedEntry[]>((acc, c) => {
      const netReturn = modeled.byCardId[c.id];
      if (netReturn !== undefined) acc.push({ name: c.name, netReturn });
      return acc;
    }, [])
    .sort((a, b) => b.netReturn - a.netReturn);

  const sentences = buildSentences(ranked, profile.monthlyDomesticBrl);
  if (sentences.length === 0) return null;

  return (
    <aside
      aria-label="Resumo da comparação"
      className="text-body-sm text-ink-muted bg-surface-sunken mb-4 rounded-md p-4"
    >
      {sentences.join(" ")}
    </aside>
  );
};
