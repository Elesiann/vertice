import { useState, type JSX } from "react";
import { CardArt } from "@/components/domain/CardArt";
import { cn } from "@/lib/cn";

interface CardImageProps {
  imagePath?: string;
  name: string;
  brand: string;
  tier: string;
  bank?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE: Record<NonNullable<CardImageProps["size"]>, string> = {
  xs: "w-[84px]",
  sm: "w-[120px]",
  md: "w-[240px]",
  lg: "w-[320px]",
};

export const CardImage = ({
  imagePath,
  name,
  brand,
  tier,
  bank,
  size = "md",
  className,
}: CardImageProps): JSX.Element => {
  const [failed, setFailed] = useState(false);

  if (imagePath === undefined || failed) {
    return (
      <CardArt
        brand={brand}
        tier={tier}
        size={size}
        {...(bank !== undefined ? { bank } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }

  return (
    <img
      src={imagePath}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true);
      }}
      className={cn("block object-contain", SIZE[size], className)}
      style={{ aspectRatio: "1.586 / 1" }}
    />
  );
};
