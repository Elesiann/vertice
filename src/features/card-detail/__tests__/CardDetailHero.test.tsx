import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardDetailHero } from "@/features/card-detail/CardDetailHero";
import type { PublicCardDetail } from "@/types";

const card: PublicCardDetail = {
  id: "test-card",
  name: "Cartão Teste",
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

describe("CardDetailHero", () => {
  it("shows verification date and source links when available", () => {
    render(
      <CardDetailHero
        card={{
          ...card,
          lastVerified: "2026-05-08T00:00:00.000Z",
          verifiedSources: ["https://example.com/card"],
        }}
      />,
    );

    expect(screen.getByText("Verificado em 08/05/2026")).toBeInTheDocument();
    expect(screen.getByText("Fontes:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/card" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("omits verification metadata when lastVerified is absent", () => {
    render(<CardDetailHero card={card} />);
    expect(screen.queryByText(/verificado em/i)).not.toBeInTheDocument();
  });
});
