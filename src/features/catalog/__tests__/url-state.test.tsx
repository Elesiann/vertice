import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import type { CardCatalogResponse, CatalogFilters } from "@/types";

const fetchCardCatalog = vi.fn<(filters?: CatalogFilters) => Promise<CardCatalogResponse>>();

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: (filters?: CatalogFilters): Promise<CardCatalogResponse> =>
    fetchCardCatalog(filters),
}));

const catalogResponse: CardCatalogResponse = {
  cards: [],
  catalogVersion: "test",
  count: 0,
  filters: {},
};

const LocationProbe = (): React.JSX.Element => {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
};

const renderCatalog = (initialEntry: string): void => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CatalogPage />
      <LocationProbe />
    </MemoryRouter>,
  );
};

describe("catalog URL state", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(catalogResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates filters from the URL", () => {
    renderCatalog("/cards?brand=visa");

    expect(screen.getByRole("button", { name: "Bandeira: Visa" })).toBeInTheDocument();
  });

  it("writes filter changes to URLSearchParams", async () => {
    renderCatalog("/cards");

    await userEvent.type(screen.getByLabelText("Buscar"), "itau");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?search=itau");
    });
  });
});
