import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const renderCompareTable = (inputCards: PublicCardDetail[] = cards): void => {
  render(
    <MemoryRouter>
      <CompareTable cards={inputCards} />
    </MemoryRouter>,
  );
};

describe("CompareTable", () => {
  it("renders both card names", () => {
    renderCompareTable();
    expect(screen.getByText("Cartão Alpha")).toBeInTheDocument();
    expect(screen.getByText("Cartão Beta")).toBeInTheDocument();
  });

  it("renders the annual fee row", () => {
    renderCompareTable();
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);
  });

  it("hides equal rows when toggle is enabled", async () => {
    renderCompareTable();

    await userEvent.click(screen.getByLabelText("Esconder linhas iguais"));

    expect(screen.queryByText("Programa")).not.toBeInTheDocument();
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
  });

  it("disables hide-equal toggle when there is only one card", () => {
    renderCompareTable([makeCard("single", "Cartão Solo", 1200)]);

    expect(screen.getByLabelText("Esconder linhas iguais")).toBeDisabled();
  });
});
