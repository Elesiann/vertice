import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  name = `Cartão ${id}`,
  bank: PublicCatalogCard["bank"] = "nubank",
  tier: PublicCatalogCard["tier"] = "gold",
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

const response = (cards: PublicCatalogCard[]): CardCatalogResponse => ({
  cards,
  catalogVersion: "test",
  count: cards.length,
  filters: {},
});

const renderList = (filters: CatalogFilters, onClearFilters = vi.fn()): void => {
  render(
    <MemoryRouter>
      <CatalogList filters={filters} onClearFilters={onClearFilters} />
    </MemoryRouter>,
  );
};

describe("CatalogList counts and clear-filters", () => {
  beforeEach(() => {
    fetchCardCatalog.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows visible and total card counts", async () => {
    fetchCardCatalog.mockResolvedValueOnce(response([makeCard("a")]));
    fetchCardCatalog.mockResolvedValueOnce(response([makeCard("a"), makeCard("b")]));

    renderList({ search: "alpha" });

    expect(await screen.findByText("Mostrando 1 de 2 cartões")).toBeInTheDocument();
  });

  it("shows clear filters button only when filters are active", async () => {
    fetchCardCatalog.mockResolvedValue(response([makeCard("a")]));
    const onClearFilters = vi.fn();

    renderList({ hasLounge: true }, onClearFilters);

    await userEvent.click(await screen.findByRole("button", { name: "Limpar filtros" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("omits clear filters button when filters are empty", async () => {
    fetchCardCatalog.mockResolvedValue(response([makeCard("a")]));

    renderList({});

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
    });
  });
});

describe("CatalogList search", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(
      response([
        makeCard("itau-platinum", "Itaú Platinum", "itau", "platinum"),
        makeCard("itau-gold", "Itaú Gold", "itau", "gold"),
        makeCard("other-platinum", "Outro Platinum", "other", "platinum"),
      ]),
    );
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
