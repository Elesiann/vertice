import { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { CatalogCard } from "@/features/catalog/CatalogCard";
import type { CardVerifiedTier, PublicCatalogCard, SpendingProfile } from "@/types";

type CatalogCardWithVerification = PublicCatalogCard & {
  lastVerified?: string;
  verifiedTier?: CardVerifiedTier;
};

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

const ownedProfile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
  currentCardIds: ["test-card"],
};

const otherCardProfile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
  currentCardIds: ["current-card"],
};

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const LocationProbe = (): React.JSX.Element => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

const renderCard = (
  currentProfile: SpendingProfile | null = null,
  cardOverride: CatalogCardWithVerification = card,
  props = {},
) => {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={currentProfile} />
        <CatalogCard card={cardOverride} {...props} />
        <LocationProbe />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("CatalogCard", () => {
  it("renders card name", () => {
    renderCard();
    expect(screen.getByText("Cartão Teste")).toBeInTheDocument();
  });

  it("shows the Sala VIP perk when hasLoungeAccess", () => {
    renderCard();
    expect(screen.getByText("Sala VIP")).toBeInTheDocument();
  });

  it("shows the points-program perk", () => {
    renderCard();
    expect(screen.getByText("Smiles")).toBeInTheDocument();
  });

  it("shows the annual-fee block for cards that charge one (short format, no cents)", () => {
    renderCard();
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
    expect(screen.getByText(/R\$ 1\.200/)).toBeInTheDocument();
  });

  it("shows 'Zero' for fee-free cards", () => {
    renderCard(null, { ...card, annualFeeBrl: 0 });
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
    expect(screen.getByText("Zero")).toBeInTheDocument();
  });

  it("shows an access-barrier chip for cards gated by investing in the issuer's brokerage", () => {
    renderCard(null, {
      ...card,
      requiresRelationship: "investment",
      requiredInvestmentBrl: 20000,
    });
    expect(screen.getByText("Exige R$ 20 mil")).toBeInTheDocument();
    expect(
      screen.getByText("Exige R$ 20 mil investidos na corretora do emissor"),
    ).toBeInTheDocument();
  });

  it("does not show an access-barrier chip for a mere checking-account requirement", () => {
    renderCard(null, { ...card, requiresRelationship: "checking" });
    expect(screen.queryByText(/exige|private banking/i)).not.toBeInTheDocument();
  });

  it("does not surface annual-fee-waiver conditions on the card", () => {
    renderCard(null, { ...card, annualFeeWaiverThresholdBrl: 5000 });
    expect(screen.queryByText(/isenta com/i)).not.toBeInTheDocument();
  });

  it("shows verification date when lastVerified is present", () => {
    renderCard(null, { ...card, lastVerified: "2026-05-08T00:00:00.000Z" });
    expect(screen.getByText("Verificado em 08/05/2026")).toBeInTheDocument();
  });

  it("omits verification date when lastVerified is absent", () => {
    renderCard();
    expect(screen.queryByText(/verificado em/i)).not.toBeInTheDocument();
  });

  it("marks the card as the user's current card when it is in the session profile", () => {
    renderCard(ownedProfile);
    expect(screen.getByText("Seu cartão")).toBeInTheDocument();
  });

  it("does not mark the card when it is not in the session profile", () => {
    renderCard(null, card);

    expect(screen.queryByText("Seu cartão")).not.toBeInTheDocument();
  });

  it("calls onCompare when compare button clicked without a current card", async () => {
    const onCompare = vi.fn();
    renderCard(null, card, { onCompare });
    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));
    expect(onCompare).toHaveBeenCalledWith("test-card");
  });

  it("calls onCompare when profile has currentCardIds", async () => {
    const onCompare = vi.fn();
    renderCard(otherCardProfile, card, { onCompare });

    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));

    expect(onCompare).toHaveBeenCalledWith("test-card");
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("calls onCompare when selected card is already current", async () => {
    const onCompare = vi.fn();
    renderCard(ownedProfile, card, { onCompare });

    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));

    expect(onCompare).toHaveBeenCalledWith("test-card");
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});
