import { type ElementType, type HTMLAttributes, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "raised" | "sunken";

const TONE: Record<Tone, string> = {
  raised: "border-line bg-surface-raised rounded-lg border",
  sunken: "border-line bg-surface-sunken rounded-md border",
};

interface PanelProps extends HTMLAttributes<HTMLElement> {
  tone?: Tone;
  as?: ElementType;
  children: ReactNode;
}

export const Panel = ({
  tone = "raised",
  as: Tag = "section",
  className,
  children,
  ...rest
}: PanelProps): JSX.Element => (
  <Tag className={cn(TONE[tone], className)} {...rest}>
    {children}
  </Tag>
);
