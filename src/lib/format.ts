const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatBrl = (amount: number): string => BRL_FORMATTER.format(amount);

export const formatUsd = (amount: number): string => USD_FORMATTER.format(amount);

export const formatMonths = (months: number): string =>
  months < 1 ? "menos de 1 mês" : `${months.toFixed(1)} meses`;
