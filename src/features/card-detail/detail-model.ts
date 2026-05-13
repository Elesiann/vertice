import { formatBrl, formatCashbackRate, formatPoints, formatUsd } from "@/lib/format";
import { formatBankLabel, formatPointsProgram } from "@/lib/labels";
import type {
  CardBrand,
  CardTier,
  CardVerifiedTier,
  PublicCardDetail,
  RelationshipLevel,
  SpendingProfile,
} from "@/types";

export type CopyTone = "accent" | "ink" | "muted" | "warning";

export interface DetailCopy {
  value: string;
  note?: string | undefined;
  tone?: CopyTone | undefined;
}

const BRAND_LABEL: Record<CardBrand, string> = {
  amex: "Amex",
  elo: "Elo",
  hipercard: "Hipercard",
  mastercard: "Mastercard",
  visa: "Visa",
};

const TIER_LABEL: Record<CardTier, string> = {
  black: "Black",
  gold: "Gold",
  infinite: "Infinite",
  platinum: "Platinum",
  standard: "Standard",
};

export const RELATIONSHIP_LABEL: Record<RelationshipLevel, string> = {
  checking: "Conta corrente ativa",
  investment: "Cliente investidor",
  open: "Sem relacionamento mínimo",
  private: "Private banking",
};

export const VERIFIED_TIER_LABEL: Record<CardVerifiedTier, string> = {
  1: "confiança alta",
  2: "confiança média",
  3: "confiança baixa",
};

export const VERIFIED_TIER_CRITERIA: Record<CardVerifiedTier, string> = {
  1: "Conferido contra o site oficial do emissor nos últimos 90 dias.",
  2: "Conferido contra fonte secundária, ou a checagem oficial passou de 90 dias.",
  3: "Dado declarado por fonte única, ainda sem segunda confirmação.",
};

export const FX_SOURCE_LABEL: Record<string, string> = {
  assumption: "Estimado",
  mixed: "Misto",
  official: "Fonte oficial",
  secondary: "Fonte secundária",
};

const formatPercent = (value: number): string => `${value.toFixed(2).replace(".", ",")}%`;

export const cardIssuerLine = (card: PublicCardDetail): string =>
  `${formatBankLabel(card.bank, card.id)} · ${TIER_LABEL[card.tier]} · ${BRAND_LABEL[card.brand]}`;

export const feeWaiverConditions = (card: PublicCardDetail): string[] => {
  const conditions: string[] = [];
  if (card.annualFeeWaiverThresholdBrl !== undefined) {
    conditions.push(`${formatBrl(card.annualFeeWaiverThresholdBrl)}/mês em gasto`);
  }
  if (card.investmentFeeWaiverBrl !== undefined) {
    conditions.push(`${formatBrl(card.investmentFeeWaiverBrl)} investidos`);
  }
  return conditions;
};

// Os R$ X "investidos" do catálogo são, para cartões de conta corrente ou
// abertos, isenção de anuidade — não barreira de contratação. Tratamos essa
// ambiguidade uma vez, no topo da seção Acesso, e não repetimos nas linhas.
export const investmentDisambiguationNote = (card: PublicCardDetail): string | null => {
  const waiver = card.investmentFeeWaiverBrl;
  if (waiver === undefined) return null;
  const relationship = card.requiresRelationship ?? "open";
  if (relationship === "investment" || relationship === "private") return null;
  return `Os ${formatBrl(waiver)} investidos zeram a anuidade. Não são exigidos para contratar.`;
};

const accessAmount = (card: PublicCardDetail): string | null => {
  const brl = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  if (brl !== undefined) return formatBrl(brl);
  const usd = card.requiredInvestmentUsd ?? card.minInvestmentUsd;
  if (usd !== undefined) return formatUsd(usd);
  return null;
};

export const accessCopy = (card: PublicCardDetail): DetailCopy => {
  const relationship = card.requiresRelationship ?? "open";
  const amount = accessAmount(card);

  if (relationship === "private") {
    return {
      value: RELATIONSHIP_LABEL.private,
      note: amount !== null ? `Acesso condicionado a ${amount} no emissor.` : undefined,
      tone: "warning",
    };
  }

  if (relationship === "investment") {
    return {
      value: amount !== null ? `${amount} investidos` : RELATIONSHIP_LABEL.investment,
      note: "Investimento tratado como barreira de contratação.",
      tone: "warning",
    };
  }

  if (relationship === "checking") {
    return { value: RELATIONSHIP_LABEL.checking, tone: "ink" };
  }

  return {
    value: RELATIONSHIP_LABEL.open,
    note: "Sem barreira de relacionamento no catálogo público.",
    tone: "muted",
  };
};

export const returnCopy = (card: PublicCardDetail): DetailCopy => {
  if (card.cashbackRatePercent !== undefined) {
    return {
      value: `${formatCashbackRate(card.cashbackRatePercent)} ${
        card.hasInvestback === true ? "em investback" : "cashback"
      }`,
      note:
        card.hasInvestback === true
          ? "Retorno aplicado no emissor, não tratado como crédito direto em fatura."
          : undefined,
      tone: "ink",
    };
  }

  const rates = [
    card.pointsPerUsdDomestic !== undefined
      ? `${card.pointsPerUsdDomestic.toFixed(2).replace(".", ",")} pts/USD nacional`
      : null,
    card.pointsPerUsdInternational !== undefined
      ? `${card.pointsPerUsdInternational.toFixed(2).replace(".", ",")} pts/USD exterior`
      : null,
  ].filter((rate): rate is string => rate !== null);

  return {
    value: formatPointsProgram(card.pointsProgram),
    note: rates.length > 0 ? rates.join(" · ") : undefined,
    tone: "ink",
  };
};

export const loungeCopy = (card: PublicCardDetail): DetailCopy | null => {
  const lounge = card.loungeAccess;
  if (lounge === undefined) return null;

  const value =
    lounge.unlimited === true
      ? "Ilimitado"
      : lounge.visitsPerYear !== undefined
        ? `${String(lounge.visitsPerYear)} visitas/ano`
        : lounge.conditional === true
          ? "Condicional"
          : "Incluído";
  // A lista de redes vira a linha "Redes aceitas" — não repetimos aqui.
  const condition =
    lounge.conditionalMonthlySpendBrl !== undefined
      ? `Exige ${formatBrl(lounge.conditionalMonthlySpendBrl)}/mês para liberar.`
      : undefined;

  return {
    value,
    note: condition,
    tone: lounge.conditional === true ? "warning" : "ink",
  };
};

export const internationalCopy = (card: PublicCardDetail): DetailCopy => {
  const spread =
    card.foreignExchangeSpreadPercent !== undefined
      ? `Spread ${formatPercent(card.foreignExchangeSpreadPercent)}`
      : "Spread não informado";
  const source =
    card.foreignExchangeCostSource !== undefined
      ? (FX_SOURCE_LABEL[card.foreignExchangeCostSource] ?? card.foreignExchangeCostSource)
      : undefined;

  return {
    value: card.hasZeroIof ? "IOF zero" : "IOF padrão",
    note: source !== undefined ? `${spread} · ${source}` : spread,
    tone: "ink",
  };
};

// O resumo só ganha um quarto slot ("Internacional") quando o cartão tem
// alguma história de câmbio que valha destacar — IOF zerado ou spread/fonte
// declarados. Caso contrário, fica nos três do schema do leitor.
export const hasInternationalAngle = (card: PublicCardDetail): boolean =>
  card.hasZeroIof ||
  card.foreignExchangeSpreadPercent !== undefined ||
  card.foreignExchangeCostSource !== undefined;

export const pointsExpirationCopy = (months: number): string =>
  months === 0 ? "Não expiram" : `${String(months)} meses`;

export const welcomeBonusCopy = (points: number): string => `${formatPoints(points)} pontos`;

// Banda de spread cambial observada na maioria dos cartões do catálogo. Serve
// como régua qualitativa — não é uma média estatística publicada.
const SPREAD_REFERENCE_BAND = "2,5%–3,5%";

export const spreadReferenceNote = (spreadPercent: number): string => {
  if (spreadPercent > 3.5) return `Acima da faixa usual (${SPREAD_REFERENCE_BAND}).`;
  if (spreadPercent < 2.5) return `Abaixo da faixa usual (${SPREAD_REFERENCE_BAND}).`;
  return `Dentro da faixa usual (${SPREAD_REFERENCE_BAND}).`;
};

const monthlyEquivalent = (annualBrl: number): string => formatBrl(Math.round(annualBrl / 12));

// Custo efetivo da anuidade considerando o perfil salvo na sessão (gasto mensal
// e valor investido). Sem perfil, mostra o cenário que zera a anuidade, quando
// existe, ou o valor cheio. `compact` devolve uma nota curta para o resumo do
// topo — a explicação completa fica na seção "Custo efetivo".
export const effectiveFeeCopy = (
  card: PublicCardDetail,
  profile: SpendingProfile | null,
  options: { compact?: boolean } = {},
): DetailCopy => {
  const compact = options.compact === true;

  if (card.annualFeeBrl === 0) {
    return { value: "R$ 0/ano", note: compact ? undefined : "Cartão sem anuidade.", tone: "ink" };
  }

  const threshold = card.annualFeeWaiverThresholdBrl;
  const investWaiver = card.investmentFeeWaiverBrl;
  const fullFee = `${formatBrl(card.annualFeeBrl)}/ano`;
  const monthly = monthlyEquivalent(card.annualFeeBrl);
  const firstYearFree = card.firstYearAnnualFeeBrl === 0;

  if (profile !== null) {
    const spend = profile.monthlyDomesticBrl;
    const invested = profile.availableToInvestBrl;
    const waivedBySpend = threshold !== undefined && spend >= threshold;
    const waivedByInvest =
      investWaiver !== undefined && invested !== undefined && invested >= investWaiver;

    if (waivedBySpend) {
      return {
        value: "R$ 0/ano",
        note: compact
          ? "Isenção pelo seu gasto mensal."
          : `Você gasta ${formatBrl(spend)}/mês e atinge a isenção de ${formatBrl(threshold)}/mês.`,
        tone: "accent",
      };
    }
    if (waivedByInvest) {
      return {
        value: "R$ 0/ano",
        note: compact
          ? "Isenção pelo investimento que você tem."
          : `Você tem ${formatBrl(invested)} investidos e atinge a isenção de ${formatBrl(investWaiver)}.`,
        tone: "accent",
      };
    }

    const gaps: string[] = [];
    if (threshold !== undefined) {
      gaps.push(`isenção exige ${formatBrl(threshold)}/mês em gasto (você: ${formatBrl(spend)})`);
    }
    if (investWaiver !== undefined) {
      gaps.push(
        invested !== undefined
          ? `${formatBrl(investWaiver)} investidos (você: ${formatBrl(invested)})`
          : `${formatBrl(investWaiver)} investidos`,
      );
    }
    const gapNote = gaps.length > 0 ? `Hoje você não zera: ${gaps.join("; ")}.` : undefined;
    if (firstYearFree) {
      return {
        value: "R$ 0 no 1º ano",
        note: compact
          ? `Depois ${monthly}/mês; hoje você não zera.`
          : [`Depois ${monthly}/mês.`, gapNote]
              .filter((p): p is string => p !== undefined)
              .join(" "),
        tone: "warning",
      };
    }
    return {
      value: fullFee,
      note: compact
        ? "Você não atinge a isenção no gasto atual."
        : [`Equivale a ${monthly}/mês.`, gapNote]
            .filter((p): p is string => p !== undefined)
            .join(" "),
      tone: "warning",
    };
  }

  if (threshold !== undefined || investWaiver !== undefined) {
    const conditions = feeWaiverConditions(card).join(" ou ");
    return {
      value: "R$ 0/ano",
      note: compact
        ? "Cenário com a isenção; sem perfil salvo."
        : `Cenário com ${conditions}. Refaça o formulário para calcular com o seu gasto.`,
      tone: "ink",
    };
  }
  if (firstYearFree) {
    return { value: "R$ 0 no 1º ano", note: `Depois ${monthly}/mês.`, tone: "ink" };
  }
  return { value: fullFee, note: compact ? undefined : `Equivale a ${monthly}/mês.`, tone: "ink" };
};

export interface CategoryLink {
  label: string;
  param: "tier" | "brand" | "bank";
  value: string;
}

// Links de catálogo a partir dos atributos do cartão. O filtro por banco usa
// o enum `Bank`; para `bank: "other"` ele não tem como restringir ao emissor
// real, então a faixa é omitida nesse caso.
export const categoryLinks = (card: PublicCardDetail): CategoryLink[] => {
  const links: CategoryLink[] = [
    { label: `Cartões ${TIER_LABEL[card.tier]}`, param: "tier", value: card.tier },
    { label: `Cartões ${BRAND_LABEL[card.brand]}`, param: "brand", value: card.brand },
  ];
  if (card.bank !== "other") {
    links.push({
      label: `Cartões ${formatBankLabel(card.bank, card.id)}`,
      param: "bank",
      value: card.bank,
    });
  }
  return links;
};
