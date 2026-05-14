import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import { fetchCardCatalog } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: vi.fn(),
}));

const mockedFetchCardCatalog = vi.mocked(fetchCardCatalog);

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

describe("premium free catalog chip", () => {
  beforeEach(() => {
    mockedFetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  it("toggles only max annual fee and lounge filters in the URL", async () => {
    const user = userEvent.setup();
    renderCatalog("/cards?brand=visa");

    const chip = screen.getByRole("button", { name: "Premium grátis" });

    await user.click(chip);

    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(currentSearchParams().get("brand")).toBe("visa");
    expect(currentSearchParams().get("maxAnnualFee")).toBe("0");
    expect(currentSearchParams().get("hasLounge")).toBe("true");

    await user.click(chip);

    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(currentSearchParams().get("brand")).toBe("visa");
    expect(currentSearchParams().get("maxAnnualFee")).toBeNull();
    expect(currentSearchParams().get("hasLounge")).toBeNull();
  });

  it("keeps max annual fee when the mobile premium preset is used with the panel open", async () => {
    const user = userEvent.setup();
    renderCatalog("/cards?brand=visa");

    await user.click(screen.getByRole("button", { name: /Filtros/ }));
    await user.click(screen.getByRole("button", { name: /Premium grátis Sem anuidade \+ lounge/ }));

    await new Promise((resolve) => {
      setTimeout(resolve, 350);
    });

    expect(currentSearchParams().get("brand")).toBe("visa");
    expect(currentSearchParams().get("maxAnnualFee")).toBe("0");
    expect(currentSearchParams().get("hasLounge")).toBe("true");
  });
});
