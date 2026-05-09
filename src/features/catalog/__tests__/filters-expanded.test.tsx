import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import type { PublicCatalogCard } from "@/types";

const cards: PublicCatalogCard[] = [
  {
    id: "investback-checking",
    name: "Cartão Investback",
    bank: "itau",
    brand: "visa",
    tier: "black",
    pointsProgram: "livelo",
    annualFeeBrl: 500,
    requiresRelationship: "checking",
    hasLoungeAccess: false,
    hasTravelInsurance: false,
    hasFreeCheckedBaggage: false,
    hasZeroIof: false,
    hasInvestback: true,
  },
  {
    id: "cashback-investment",
    name: "Cartão Cashback",
    bank: "nubank",
    brand: "mastercard",
    tier: "gold",
    pointsProgram: "cashback",
    annualFeeBrl: 50,
    requiresRelationship: "investment",
    hasLoungeAccess: false,
    hasTravelInsurance: false,
    hasFreeCheckedBaggage: false,
    hasZeroIof: false,
    hasInvestback: false,
  },
  {
    id: "private-investback",
    name: "Cartão Private",
    bank: "bradesco",
    brand: "visa",
    tier: "infinite",
    pointsProgram: "livelo",
    annualFeeBrl: 900,
    requiresRelationship: "private",
    hasLoungeAccess: false,
    hasTravelInsurance: false,
    hasFreeCheckedBaggage: false,
    hasZeroIof: false,
    hasInvestback: true,
  },
];

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="url-search">{location.search}</output>;
};

const renderCatalog = (initialEntry = "/cards") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CatalogPage />
      <LocationProbe />
    </MemoryRouter>,
  );

const currentSearchParams = () =>
  new URLSearchParams(screen.getByLabelText("url-search").textContent);

const lastRequestParams = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls.at(-1);
  const url = new URL(String(call?.[0]));
  return url.searchParams;
};

describe("expanded catalog filters", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            cards,
            catalogVersion: "test",
            count: cards.length,
            filters: {},
          }),
        ),
      ),
    );
  });

  it("persists expanded filters in the URL and request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    renderCatalog();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await user.click(screen.getByLabelText("Investback (CDB automático)"));
    expect(currentSearchParams().get("hasInvestback")).toBe("true");
    await waitFor(() => {
      expect(lastRequestParams(fetchMock).get("hasInvestback")).toBe("true");
    });

    await user.click(screen.getByLabelText("Conta corrente"));
    await user.click(screen.getByLabelText("Investidor"));
    expect(currentSearchParams().get("requiresRelationship")).toBe("checking,investment");
    await waitFor(() => {
      expect(lastRequestParams(fetchMock).get("requiresRelationship")).toBe("checking,investment");
    });

    await user.type(screen.getByLabelText("Anuidade mínima (R$)"), "100");
    expect(currentSearchParams().get("minAnnualFee")).toBe("100");
    await waitFor(() => {
      expect(lastRequestParams(fetchMock).get("minAnnualFee")).toBe("100");
    });

    await user.type(screen.getByLabelText("Anuidade máxima (R$)"), "700");
    expect(currentSearchParams().get("maxAnnualFee")).toBe("700");
    await waitFor(() => {
      expect(lastRequestParams(fetchMock).get("maxAnnualFee")).toBe("700");
    });

    await screen.findByText("Cartão Investback");
    expect(screen.queryByText("Cartão Cashback")).not.toBeInTheDocument();
    expect(screen.queryByText("Cartão Private")).not.toBeInTheDocument();
  });
});
