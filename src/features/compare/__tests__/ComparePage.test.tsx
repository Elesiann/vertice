import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ComparePage } from "@/pages/ComparePage";
import { SessionProvider } from "@/context/SessionContext";
import { ok } from "@/lib/result";
import { useCompareStore } from "@/lib/compare-store";
import type { CardCatalogResponse, PublicCardDetail } from "@/types";

const fetchCardDetail = vi.fn<(id: string) => Promise<ReturnType<typeof ok<PublicCardDetail>>>>();
const fetchCardCatalog = vi.fn<() => Promise<CardCatalogResponse>>();

vi.mock("@/lib/api", () => ({
  fetchCardDetail: (id: string) => fetchCardDetail(id),
  fetchCardCatalog: () => fetchCardCatalog(),
}));

const makeCard = (id: string, name: string): PublicCardDetail => ({
  id,
  name,
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

const LocationProbe = (): React.JSX.Element => {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
};

const renderPage = (entry: string): void => {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SessionProvider>
        <ComparePage />
        <LocationProbe />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("ComparePage inline add", () => {
  beforeEach(() => {
    useCompareStore.setState({ ids: [] });
    fetchCardDetail.mockImplementation((id) => Promise.resolve(ok(makeCard(id, `Cartão ${id}`))));
    fetchCardCatalog.mockResolvedValue({
      cards: [makeCard("a", "Cartão a"), makeCard("b", "Cartão b"), makeCard("d", "Delta Gold")],
      catalogVersion: "test",
      count: 3,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds a catalog card to URL and compare store", async () => {
    renderPage("/compare?ids=a,b");

    await screen.findByText("Cartão a");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar cartão" }));
    await userEvent.type(screen.getByPlaceholderText("Buscar cartão…"), "delta");
    await userEvent.click(screen.getByRole("button", { name: /Delta Gold/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?ids=a%2Cb%2Cd");
    });
    expect(useCompareStore.getState().ids).toContain("d");
  });
});

describe("ComparePage remove card", () => {
  beforeEach(() => {
    useCompareStore.setState({ ids: ["a", "b", "c"] });
    fetchCardDetail.mockImplementation((id) =>
      Promise.resolve(ok(makeCard(id, `Cartão ${id.toUpperCase()}`))),
    );
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("removes one card from URL and compare store", async () => {
    renderPage("/compare?ids=a,b,c");

    await screen.findByText("Cartão B");
    await userEvent.click(screen.getByRole("button", { name: "Remover Cartão B" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?ids=a%2Cc");
    });
    expect(useCompareStore.getState().ids).not.toContain("b");
  });
});
