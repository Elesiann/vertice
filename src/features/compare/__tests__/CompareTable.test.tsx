import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CompareTable } from "@/features/compare/CompareTable";
import type { PublicCardDetail } from "@/types";

const makeCard = (id: string, name: string, annualFeeBrl: number): PublicCardDetail => ({
  id,
  name,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const cards = [makeCard("a", "Cartão Alpha", 1200), makeCard("b", "Cartão Beta", 800)];

describe("CompareTable", () => {
  it("renders both card names", () => {
    render(
      <MemoryRouter>
        <CompareTable cards={cards} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Cartão Alpha")).toBeInTheDocument();
    expect(screen.getByText("Cartão Beta")).toBeInTheDocument();
  });

  it("renders the annual fee row", () => {
    render(
      <MemoryRouter>
        <CompareTable cards={cards} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);
  });
});
