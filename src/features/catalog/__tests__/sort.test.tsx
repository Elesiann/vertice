import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import { SessionProvider } from "@/context/SessionContext";
import { fetchCardCatalog } from "@/lib/api";
import type { PublicCatalogCard } from "@/types";

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: vi.fn(),
}));

const cards: PublicCatalogCard[] = [
  {
    id: "beta",
    name: "Cartão Beta",
    bank: "itau",
    brand: "visa",
    tier: "black",
    pointsProgram: "livelo",
    annualFeeBrl: 900,
    hasLoungeAccess: false,
    hasTravelInsurance: false,
    hasFreeCheckedBaggage: false,
    hasZeroIof: false,
  },
  {
    id: "alpha",
    name: "Cartão Alpha",
    bank: "nubank",
    brand: "mastercard",
    tier: "gold",
    pointsProgram: "smiles",
    annualFeeBrl: 1200,
    hasLoungeAccess: false,
    hasTravelInsurance: false,
    hasFreeCheckedBaggage: false,
    hasZeroIof: false,
  },
];

const mockedFetchCardCatalog = vi.mocked(fetchCardCatalog);

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="url-search">{location.search}</output>;
};

const renderCatalog = (initialEntry = "/cards") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionProvider>
        <CatalogPage />
        <LocationProbe />
      </SessionProvider>
    </MemoryRouter>,
  );

const cardNameOrder = () =>
  screen.getAllByRole("link", { name: /Cartão/ }).map((link) => link.textContent);

describe("catalog sorting", () => {
  beforeEach(() => {
    mockedFetchCardCatalog.mockResolvedValue({
      cards,
      catalogVersion: "test",
      count: cards.length,
      filters: {},
    });
  });

  it("updates the URL when the sort changes", async () => {
    renderCatalog();

    await userEvent.click(screen.getByRole("button", { name: /^Ordenar:/ }));
    await userEvent.click(screen.getByRole("button", { name: "Maior anuidade" }));

    expect(screen.getByLabelText("url-search")).toHaveTextContent("sort=fee_desc");
  });

  it("sorts the rendered cards from the URL sort parameter", async () => {
    renderCatalog("/cards?sort=name_asc");

    await waitFor(() => {
      expect(mockedFetchCardCatalog).toHaveBeenCalled();
    });
    await screen.findByText("Cartão Alpha");

    expect(cardNameOrder()).toEqual(["Cartão Alpha", "Cartão Beta"]);
  });
});
