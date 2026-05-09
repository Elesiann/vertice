const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const POINTS_FORMATTER = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export const formatBrl = (amount: number): string => BRL_FORMATTER.format(amount);

export const formatUsd = (amount: number): string => USD_FORMATTER.format(amount);

export const formatPoints = (points: number): string => POINTS_FORMATTER.format(points);

export const formatMonths = (months: number): string =>
  months < 1 ? "menos de 1 mês" : `${months.toFixed(1)} meses`;

// `cashbackRatePercent` no catálogo é decimal fracionário (0.0125 = 1.25%),
// apesar do nome do campo. Esse helper converte para a representação humana.
export const formatCashbackRate = (rate: number): string =>
  `${(rate * 100).toFixed(2).replace(".", ",")}%`;
