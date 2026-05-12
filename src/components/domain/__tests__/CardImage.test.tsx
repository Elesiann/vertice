import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CardImage } from "@/components/domain/CardImage";

describe("CardImage", () => {
  it("renders a real card image when imagePath is available", () => {
    render(
      <CardImage
        imagePath="/card-images/nubank-ultravioleta.jpg"
        name="Nubank Ultravioleta"
        brand="mastercard"
        tier="black"
      />,
    );

    expect(screen.getByRole("img", { name: "Nubank Ultravioleta" })).toHaveAttribute(
      "src",
      "/card-images/nubank-ultravioleta.jpg",
    );
  });

  it("falls back to synthetic art when the image fails", () => {
    render(
      <CardImage
        imagePath="/card-images/missing.jpg"
        name="Fallback Card"
        brand="visa"
        tier="infinite"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Fallback Card" }));

    expect(screen.queryByRole("img", { name: "Fallback Card" })).not.toBeInTheDocument();
    expect(screen.getByText(/infinite/i)).toBeInTheDocument();
  });
});
