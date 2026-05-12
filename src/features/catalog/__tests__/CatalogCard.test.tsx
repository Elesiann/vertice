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

  it("shows lounge badge when hasLoungeAccess", () => {
    renderCard();
    expect(screen.getByText(/lounge/i)).toBeInTheDocument();
  });

  it("renders the annual fee as a structured row", () => {
    renderCard();
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200,00")).toBeInTheDocument();
  });

  it("does not show a fee-tier badge for fee-free cards (the row already says R$ 0,00)", () => {
    renderCard(null, { ...card, annualFeeBrl: 0 });
    expect(screen.queryByText(/sem anuidade/i)).not.toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  it("shows an investment-access row for cards gated by investing in the issuer's brokerage", () => {
    renderCard(null, {
      ...card,
      requiresRelationship: "investment",
      requiredInvestmentBrl: 20000,
    });
    expect(screen.getByText("Acesso")).toBeInTheDocument();
    expect(screen.getByText("R$ 20.000,00 investidos na corretora do emissor")).toBeInTheDocument();
  });

  it("shows a checking-account access row for cards gated by a checking relationship", () => {
    renderCard(null, { ...card, requiresRelationship: "checking" });
    expect(screen.getByText("conta corrente no emissor")).toBeInTheDocument();
  });

  it("shows a waiver row when the annual fee is waived by monthly spend", () => {
    renderCard(null, { ...card, annualFeeWaiverThresholdBrl: 5000 });
    expect(screen.getByText("Isenção")).toBeInTheDocument();
    expect(screen.getByText(/Gasto de R\$ 5\.000,00\/mês/)).toBeInTheDocument();
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
    renderCard(ownedProfile);
    expect(screen.getByText("Você já tem")).toBeInTheDocument();
  });

  it("omits current-card badge when card is not in the session profile", () => {
    renderCard(otherCardProfile);
    expect(screen.queryByText("Você já tem")).not.toBeInTheDocument();
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
