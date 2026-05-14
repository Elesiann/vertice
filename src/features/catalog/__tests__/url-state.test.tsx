import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";
import { useCompareStore } from "@/lib/compare-store";
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
      <CompareFloatingBar />
      <LocationProbe />
    </MemoryRouter>,
  );
};

const setScrollY = (value: number): void => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
};

const settleEffects = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("catalog URL state", () => {
  beforeEach(() => {
    setScrollY(0);
    useCompareStore.setState({ ids: [] });
    fetchCardCatalog.mockResolvedValue(catalogResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates filters from the URL", async () => {
    renderCatalog("/cards?brand=visa");
    await settleEffects();

    expect(screen.getByRole("button", { name: "Bandeira: Visa" })).toBeInTheDocument();
  });

  it("writes filter changes to URLSearchParams", async () => {
    renderCatalog("/cards");

    await userEvent.type(screen.getByLabelText("Buscar"), "itau");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?search=itau");
    });
  });

  it("writes the catalog view mode to URLSearchParams", async () => {
    renderCatalog("/cards");

    await userEvent.click(
      screen.getByRole("button", { name: "Visualização em grade, alternar para lista" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?view=list");
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Visualização em lista, alternar para grade" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("");
    });
  });

  it("hydrates the catalog view mode from the URL", async () => {
    renderCatalog("/cards?view=list");
    await settleEffects();

    expect(
      screen.getByRole("button", { name: "Visualização em lista, alternar para grade" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a floating back-to-top button after the page is scrolled", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    renderCatalog("/cards");

    expect(screen.queryByRole("button", { name: "Voltar ao topo" })).not.toBeInTheDocument();

    act(() => {
      setScrollY(481);
      window.dispatchEvent(new Event("scroll"));
    });

    await userEvent.click(await screen.findByRole("button", { name: "Voltar ao topo" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("surfaces the selected cards in a floating compare action", async () => {
    useCompareStore.setState({ ids: ["alpha", "beta"] });

    renderCatalog("/cards");

    expect(screen.getByText("2 selecionados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comparar" })).toHaveAttribute(
      "href",
      "/compare?ids=alpha,beta",
    );

    await userEvent.click(screen.getByRole("button", { name: "Limpar comparação" }));

    expect(useCompareStore.getState().ids).toEqual([]);
  });
});
