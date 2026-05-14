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

const CARD_IMAGE_DEFAULT_CROP = 1.2;

const CARD_IMAGE_CROP_BY_FILE: Record<string, number> = {
  "sofisa-direto-mastercard-black.webp": 1.2,
  "sofisa-direto-visa-infinite.webp": 1.21,
};

const cardImageCrop = (imagePath: string): number => {
  const fileName = imagePath.split("/").at(-1);
  if (fileName === undefined) return CARD_IMAGE_DEFAULT_CROP;
  return CARD_IMAGE_CROP_BY_FILE[fileName] ?? CARD_IMAGE_DEFAULT_CROP;
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
    <span
      className={cn("block overflow-hidden rounded-md", SIZE[size], className)}
      style={{ aspectRatio: "1.586 / 1" }}
    >
      <img
        src={imagePath}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(true);
        }}
        className="block size-full object-cover"
        style={{ transform: `scale(${String(cardImageCrop(imagePath))})` }}
      />
    </span>
  );
};
