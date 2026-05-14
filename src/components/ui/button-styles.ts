export const BUTTON_BASE =
  "focus-visible:ring-accent inline-flex items-center justify-center rounded-md font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_VARIANT = {
  primary: "bg-action text-action-ink hover:bg-action-hover",
  secondary: "border-line text-ink bg-surface-raised hover:bg-surface-sunken border",
  ghost: "text-ink hover:bg-surface-sunken bg-transparent",
} as const;

export const BUTTON_SIZE = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-12 px-6 text-base",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;
export type ButtonSize = keyof typeof BUTTON_SIZE;
