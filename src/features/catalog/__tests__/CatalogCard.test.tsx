import { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { CatalogCard } from "@/features/catalog/CatalogCard";
import type { PublicCatalogCard, SpendingProfile } from "@/types";

const card: PublicCatalogCard = {
  id: "test-card",
  name: "Cartão Teste",
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: true,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
  currentCardIds: ["test-card"],
};

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderCard = (
  currentProfile: SpendingProfile | null = null,
  cardOverride: PublicCatalogCard = card,
  props = {},
) => {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={currentProfile} />
        <CatalogCard card={cardOverride} {...props} />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("CatalogCard", () => {
  it("renders card name", () => {
    renderCard();
    expect(screen.getByText("Cartão Teste")).toBeInTheDocument();
  });

  it("shows lounge badge when hasLoungeAccess", () => {
    renderCard();
    expect(screen.getByText(/lounge/i)).toBeInTheDocument();
  });

  it("shows verification date when lastVerified is present", () => {
    renderCard(null, { ...card, lastVerified: "2026-05-08T00:00:00.000Z" });
    expect(screen.getByText("Verificado em 08/05/2026")).toBeInTheDocument();
  });

  it("omits verification date when lastVerified is absent", () => {
    renderCard();
    expect(screen.queryByText(/verificado em/i)).not.toBeInTheDocument();
  });

  it("shows current-card badge when card is in the session profile", () => {
    renderCard(profile);
    expect(screen.getByText("Você já tem")).toBeInTheDocument();
  });

  it("omits current-card badge when card is not in the session profile", () => {
    renderCard({ ...profile, currentCardIds: ["other-card"] });
    expect(screen.queryByText("Você já tem")).not.toBeInTheDocument();
  });

  it("calls onCompare when compare button clicked", async () => {
    const onCompare = vi.fn();
    renderCard(null, card, { onCompare });
    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));
    expect(onCompare).toHaveBeenCalledWith("test-card");
  });
});
