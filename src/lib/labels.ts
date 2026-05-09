import type { Bank, ProgramId } from "@/types";

export const POINTS_PROGRAM_LABEL: Record<ProgramId, string> = {
  smiles: "Smiles",
  "latam-pass": "LATAM Pass",
  tudoazul: "TudoAzul",
  livelo: "Livelo",
  esfera: "Esfera",
  cashback: "Cashback",
  "inter-loop": "Inter Loop",
  "uau-caixa": "UAU (Caixa)",
  atomos: "Átomos",
  "btg-points": "BTG+",
  aadvantage: "AAdvantage",
  "tap-miles-and-go": "Miles&Go (TAP)",
  "pao-de-acucar-mais": "Pão de Açúcar Mais",
  "cresol-pontos": "Cresol Pontos",
  coopera: "Coopera",
  "sisprime-pontos": "Sisprime Pontos",
  "unicred-unico": "Unicred Único",
  "safra-rewards": "Safra Rewards",
  "porto-plus": "Porto Plus",
  "nomad-pass": "Nomad Pass",
  revpoints: "RevPoints",
  "iberia-club": "Iberia Plus",
  "ba-club": "British Airways Executive Club",
  "qatar-privilege-club": "Qatar Privilege Club",
  "turkish-miles-smiles": "Turkish Miles&Smiles",
  "finnair-plus": "Finnair Plus",
  "aer-lingus-aerclub": "Aer Lingus AerClub",
  "vueling-club": "Vueling Club",
  "flying-blue": "Flying Blue",
  "etihad-guest": "Etihad Guest",
};

export const formatPointsProgram = (id: string): string =>
  (POINTS_PROGRAM_LABEL as Record<string, string>)[id] ?? id;

export type LoungeProvider = "priority-pass" | "dragon-pass" | "loungekey" | "vac" | "carded";

export const LOUNGE_PROVIDER_LABEL: Record<LoungeProvider, string> = {
  "priority-pass": "Priority Pass",
  "dragon-pass": "Dragon Pass",
  loungekey: "LoungeKey",
  vac: "VAC",
  carded: "Sala própria do cartão",
};

export const formatLoungeProvider = (id: string): string =>
  (LOUNGE_PROVIDER_LABEL as Record<string, string>)[id] ?? id;

const CANONICAL_BANK_LABEL: Record<Bank, string> = {
  nubank: "Nubank",
  itau: "Itaú",
  bradesco: "Bradesco",
  santander: "Santander",
  bb: "Banco do Brasil",
  c6: "C6",
  inter: "Inter",
  xp: "XP",
  other: "",
};

// Para `bank: "other"`, deduzimos a instituição pelo prefixo do `id` —
// alinhado com o catálogo do `stackr-api` (50 cartões dessa categoria).
const OTHER_BANK_PREFIXES: { prefix: string; label: string }[] = [
  { prefix: "btg-", label: "BTG" },
  { prefix: "caixa-", label: "Caixa" },
  { prefix: "sicredi-", label: "Sicredi" },
  { prefix: "sicoob-", label: "Sicoob" },
  { prefix: "sisprime-", label: "Sisprime" },
  { prefix: "unicred-", label: "Unicred" },
  { prefix: "cresol-", label: "Cresol" },
  { prefix: "safra-", label: "Safra" },
  { prefix: "porto-bank-", label: "Porto Bank" },
  { prefix: "picpay-", label: "PicPay" },
  { prefix: "sofisa-", label: "Banco Sofisa" },
  { prefix: "genial-", label: "Genial" },
  { prefix: "recargapay-", label: "RecargaPay" },
  { prefix: "meliuz-", label: "Méliuz" },
  { prefix: "bv-", label: "BV" },
  { prefix: "nomad-", label: "Nomad" },
  { prefix: "revolut-", label: "Revolut" },
  { prefix: "brb-", label: "BRB" },
];

export const formatBankLabel = (bank: Bank, cardId?: string): string => {
  if (bank !== "other") return CANONICAL_BANK_LABEL[bank];
  if (cardId !== undefined) {
    const match = OTHER_BANK_PREFIXES.find(({ prefix }) => cardId.startsWith(prefix));
    if (match !== undefined) return match.label;
  }
  return "Outro";
};
