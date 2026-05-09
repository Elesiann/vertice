import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ComparePage } from "@/pages/ComparePage";
import { ok } from "@/lib/result";
import { useCompareStore } from "@/lib/compare-store";
import type { PublicCardDetail } from "@/types";

const fetchCardDetail = vi.fn<(id: string) => Promise<ReturnType<typeof ok<PublicCardDetail>>>>();

vi.mock("@/lib/api", () => ({
  fetchCardDetail: (id: string) => fetchCardDetail(id),
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
      <ComparePage />
      <LocationProbe />
    </MemoryRouter>,
  );
};

describe("ComparePage remove card", () => {
  beforeEach(() => {
    useCompareStore.setState({ ids: ["a", "b", "c"] });
    fetchCardDetail.mockImplementation((id) =>
      Promise.resolve(ok(makeCard(id, `Cartão ${id.toUpperCase()}`))),
    );
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
