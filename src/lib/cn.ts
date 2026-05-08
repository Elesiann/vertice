export type ClassValue = string | number | false | null | undefined;

export const cn = (...values: ClassValue[]): string =>
  values.filter((v): v is string | number => Boolean(v)).join(" ");
