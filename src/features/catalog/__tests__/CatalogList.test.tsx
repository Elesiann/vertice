import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogList } from "@/features/catalog/CatalogList";
import type { CardCatalogResponse, CatalogFilters, PublicCatalogCard } from "@/types";

const fetchCardCatalog = vi.fn<(filters?: CatalogFilters) => Promise<CardCatalogResponse>>();

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: (filters?: CatalogFilters): Promise<CardCatalogResponse> =>
    fetchCardCatalog(filters),
}));

const makeCard = (
  id: string,
  name: string,
  bank: PublicCatalogCard["bank"],
  tier: PublicCatalogCard["tier"],
): PublicCatalogCard => ({
  id,
  name,
  bank,
  brand: "mastercard",
  tier,
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const catalogResponse: CardCatalogResponse = {
  cards: [
    makeCard("itau-platinum", "Itaú Platinum", "itau", "platinum"),
    makeCard("itau-gold", "Itaú Gold", "itau", "gold"),
    makeCard("other-platinum", "Outro Platinum", "other", "platinum"),
  ],
  catalogVersion: "test",
  count: 3,
  filters: {},
};

describe("CatalogList search", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(catalogResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("matches multi-keyword search across card fields with AND semantics", async () => {
    render(
      <MemoryRouter>
        <CatalogList filters={{ search: "itau platinum" }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Itaú Platinum")).toBeInTheDocument();
    expect(screen.queryByText("Itaú Gold")).not.toBeInTheDocument();
    expect(screen.queryByText("Outro Platinum")).not.toBeInTheDocument();
  });
});
