export const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_VARIANT = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;
