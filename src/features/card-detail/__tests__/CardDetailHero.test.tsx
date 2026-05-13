import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardDetailHero } from "@/features/card-detail/CardDetailHero";
import type { PublicCardDetail, SpendingProfile } from "@/types";

const card: PublicCardDetail = {
  id: "test-card",
  name: "Cartão Teste",
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

describe("CardDetailHero", () => {
  it("frames the hero around the reader's three questions", () => {
    render(
      <CardDetailHero
        profile={null}
        card={{
          ...card,
          annualFeeBrl: 1068,
          firstYearAnnualFeeBrl: 0,
          annualFeeWaiverThresholdBrl: 5000,
          investmentFeeWaiverBrl: 50000,
          cashbackRatePercent: 0.012,
          hasInvestback: true,
          requiresRelationship: "checking",
          verifiedTier: 2,
          lastVerified: "2026-05-09",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Cartão Teste" })).toBeInTheDocument();
    expect(screen.getByText("Exige?")).toBeInTheDocument();
    expect(screen.getByText("Anuidade?")).toBeInTheDocument();
    expect(screen.getByText("Ganhos?")).toBeInTheDocument();
    expect(screen.getByText("Conta corrente ativa")).toBeInTheDocument();
    expect(screen.getByText("1,20% em investback")).toBeInTheDocument();
    expect(screen.getByText("Última checagem em 09/05/2026")).toBeInTheDocument();
    expect(screen.getByText("confiança média")).toBeInTheDocument();
  });

  it("shows a compact effective-fee note in the hero and the full one in the section", () => {
    const profile: SpendingProfile = {
      monthlyDomesticBrl: 6000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "cashback" },
    };

    render(
      <CardDetailHero
        profile={profile}
        card={{ ...card, annualFeeBrl: 1068, annualFeeWaiverThresholdBrl: 5000 }}
      />,
    );

    expect(screen.getByText("R$ 0/ano")).toBeInTheDocument();
    expect(screen.getByText("Isenção pelo seu gasto mensal.")).toBeInTheDocument();
    expect(
      screen.queryByText("Você gasta R$ 6.000,00/mês e atinge a isenção de R$ 5.000,00/mês."),
    ).not.toBeInTheDocument();
  });

  it("does not render source links because the public detail route omits them", () => {
    render(<CardDetailHero card={card} profile={null} />);
    expect(screen.queryByText("Fontes:")).not.toBeInTheDocument();
  });
});
