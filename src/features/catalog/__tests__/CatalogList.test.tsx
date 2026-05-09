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

const makeCard = (id: string): PublicCatalogCard => ({
  id,
  name: `Cartão ${id}`,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
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

describe("CatalogList", () => {
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
