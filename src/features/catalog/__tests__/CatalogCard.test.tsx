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

  it("shows 'Sem anuidade' as a perk and no fee block for fee-free cards", () => {
    renderCard(null, { ...card, annualFeeBrl: 0 });
    expect(screen.getByText("Sem anuidade")).toBeInTheDocument();
    expect(screen.queryByText("Anuidade")).not.toBeInTheDocument();
  });

  it("shows an access-barrier line for cards gated by investing in the issuer's brokerage", () => {
    renderCard(null, {
      ...card,
      requiresRelationship: "investment",
      requiredInvestmentBrl: 20000,
    });
    expect(
      screen.getByText("Exige R$ 20 mil investidos na corretora do emissor"),
    ).toBeInTheDocument();
  });

  it("shows a checking-account requirement line for cards gated by a checking relationship", () => {
    renderCard(null, { ...card, requiresRelationship: "checking" });
    expect(screen.getByText("Precisa de conta corrente no emissor")).toBeInTheDocument();
  });

  it("shows the waiver caption when the annual fee is waived by monthly spend", () => {
    renderCard(null, { ...card, annualFeeWaiverThresholdBrl: 5000 });
    expect(screen.getByText("isenta com gasto de R$ 5 mil/mês")).toBeInTheDocument();
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
    expect(screen.getByText("Seu cartão hoje")).toBeInTheDocument();
  });

  it("does not mark the card when it is not in the session profile", () => {
    renderCard(otherCardProfile);
    expect(screen.queryByText("Seu cartão hoje")).not.toBeInTheDocument();
  });

  it("calls onCompare when compare button clicked without a current card", async () => {
    const onCompare = vi.fn();
    renderCard(null, card, { onCompare });
    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));
    expect(onCompare).toHaveBeenCalledWith("test-card");
  });

  it("navigates to compare with current card first when profile has currentCardIds", async () => {
    renderCard(otherCardProfile);

    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));

    expect(screen.getByTestId("location")).toHaveTextContent("/compare?ids=current-card,test-card");
  });

  it("does not duplicate current card when selected card is already current", async () => {
    renderCard(ownedProfile);

    await userEvent.click(screen.getByRole("button", { name: /comparar/i }));

    expect(screen.getByTestId("location")).toHaveTextContent("/compare?ids=test-card");
  });
});
