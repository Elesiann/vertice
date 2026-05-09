import { useEffect } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { CompareTable } from "@/features/compare/CompareTable";
import type { PublicCardDetail, SpendingProfile } from "@/types";

const makeCard = (id: string, name: string, annualFeeBrl: number): PublicCardDetail => ({
  id,
  name,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const cards = [makeCard("a", "Cartão Alpha", 1200), makeCard("b", "Cartão Beta", 800)];

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
  currentCardIds: ["a"],
};

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderCompareTable = (currentProfile: SpendingProfile | null = null): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={currentProfile} />
        <CompareTable cards={cards} />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("CompareTable", () => {
  it("renders both card names", () => {
    renderCompareTable();
    expect(screen.getByText("Cartão Alpha")).toBeInTheDocument();
    expect(screen.getByText("Cartão Beta")).toBeInTheDocument();
  });

  it("renders the annual fee row", () => {
    renderCompareTable();
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);
  });

  it("shows current-card badge when column card is in the session profile", async () => {
    renderCompareTable(profile);
    expect(await screen.findByText("Seu cartão")).toBeInTheDocument();
  });

  it("omits current-card badge when no compared card is current", () => {
    renderCompareTable({ ...profile, currentCardIds: ["other-card"] });
    expect(screen.queryByText("Seu cartão")).not.toBeInTheDocument();
  });
});
