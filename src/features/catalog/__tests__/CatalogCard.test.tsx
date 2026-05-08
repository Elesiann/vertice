import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CatalogCard } from "@/features/catalog/CatalogCard";
import type { PublicCatalogCard } from "@/types";

const card: PublicCatalogCard = {
  id: "test-card",
  name: "Cartão Teste",
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: true,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("CatalogCard", () => {
  it("renders card name", () => {
    render(<CatalogCard card={card} />, { wrapper: Wrapper });
    expect(screen.getByText("Cartão Teste")).toBeInTheDocument();
  });

  it("shows lounge badge when hasLoungeAccess", () => {
    render(<CatalogCard card={card} />, { wrapper: Wrapper });
    expect(screen.getByText(/lounge/i)).toBeInTheDocument();
  });

  it("calls onCompare when compare button clicked", async () => {
    const onCompare = vi.fn();
    render(<CatalogCard card={card} onCompare={onCompare} />, { wrapper: Wrapper });
    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));
    expect(onCompare).toHaveBeenCalledWith("test-card");
  });
});
