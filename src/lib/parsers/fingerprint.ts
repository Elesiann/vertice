const STRUCTURAL_MARKERS: readonly string[] = [
  "RESUMO DA FATURA",
  "TRANSAÇÕES",
  "Total a pagar",
  "Período vigente",
  "Limite total",
  "FATURA",
  "Pagamentos e Financiamentos",
  "PRÓXIMAS FATURAS",
];

const TX_LINE_PATTERN =
  /\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+[^\n]+R\$\s*[\d.,]+/i;

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

const fnv1a = (text: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const txCountBucket = (count: number): string => {
  if (count === 0) return "0";
  if (count < 50) return "1-49";
  if (count < 200) return "50-199";
  return "200+";
};

export const computeLayoutFingerprint = (rawText: string): string => {
  const presentMarkers = STRUCTURAL_MARKERS.filter((marker) => rawText.includes(marker)).sort();
  const txMatches = rawText.match(new RegExp(TX_LINE_PATTERN, "g")) ?? [];
  const signature = `${presentMarkers.join("|")}::tx=${txCountBucket(txMatches.length)}`;
  return fnv1a(signature);
};
