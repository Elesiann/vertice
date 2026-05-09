import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogList } from "@/features/catalog/CatalogList";
import type { CardCatalogResponse, CatalogFilters } from "@/types";

const fetchCardCatalog = vi.fn<(filters?: CatalogFilters) => Promise<CardCatalogResponse>>();

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: (filters?: CatalogFilters): Promise<CardCatalogResponse> =>
    fetchCardCatalog(filters),
}));

const emptyResponse: CardCatalogResponse = {
  cards: [],
  catalogVersion: "test",
  count: 0,
  filters: {},
};

const renderList = (filters: CatalogFilters): void => {
  render(
    <MemoryRouter>
      <CatalogList filters={filters} />
    </MemoryRouter>,
  );
};

describe("CatalogList empty state", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(emptyResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("suggests raising the fee cap when max annual fee is low", async () => {
    renderList({ maxAnnualFee: 100, hasLounge: true });

    expect(await screen.findByText("Nenhum cartão com esses filtros.")).toBeInTheDocument();
    expect(screen.getByText("Tente ampliar a anuidade até R$ 500.")).toBeInTheDocument();
  });

  it("suggests removing lounge filter when lounge is active", async () => {
    renderList({ hasLounge: true });

    expect(await screen.findByText("Tente sem o filtro de lounge.")).toBeInTheDocument();
  });

  it("uses generic suggestion when no specific filter applies", async () => {
    renderList({ search: "xyz" });

    expect(await screen.findByText("Tente ampliar a busca.")).toBeInTheDocument();
  });
});
