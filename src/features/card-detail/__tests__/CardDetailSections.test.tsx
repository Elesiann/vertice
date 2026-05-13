import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CardDetailSections } from "@/features/card-detail/CardDetailSections";
import type { PublicCardDetail, SpendingProfile } from "@/types";

const picpayBlack: PublicCardDetail = {
  id: "picpay-mastercard-black",
  name: "PicPay Card Black",
  bank: "other",
  brand: "mastercard",
  tier: "black",
  pointsProgram: "cashback",
  annualFeeBrl: 1068,
  firstYearAnnualFeeBrl: 0,
  annualFeeWaiverThresholdBrl: 5000,
  investmentFeeWaiverBrl: 50000,
  requiresRelationship: "checking",
  hasLoungeAccess: true,
  hasTravelInsurance: true,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
  hasInvestback: true,
  cashbackRatePercent: 0.012,
  loungeAccess: {
    visitsPerYear: 2,
    providers: ["carded"],
  },
  travelInsuranceLevel: "premium",
  benefits: [
    { kind: "benefit", label: "1.2% cashback" },
    { kind: "benefit", label: "1º ano grátis para clientes selecionados" },
  ],
  verifiedTier: 2,
  lastVerified: "2026-05-09",
};

describe("CardDetailSections", () => {
  it("groups the page by the reader's three questions", () => {
    render(<CardDetailSections card={picpayBlack} profile={null} />);

    const access = screen.getByRole("region", { name: "Acesso" });
    expect(within(access).getByText("Exige?")).toBeInTheDocument();
    expect(within(access).getByText("Conta corrente ativa")).toBeInTheDocument();
    expect(
      within(access).getByText(
        "Os R$ 50.000,00 investidos zeram a anuidade. Não são exigidos para contratar.",
      ),
    ).toBeInTheDocument();

    const cost = screen.getByRole("region", { name: "Custo efetivo" });
    expect(within(cost).getByText("Anuidade?")).toBeInTheDocument();
    expect(within(cost).getByText("R$ 1.068,00/ano")).toBeInTheDocument();
    expect(within(cost).getByText("R$ 5.000,00/mês")).toBeInTheDocument();
    expect(within(cost).getByText("R$ 50.000,00")).toBeInTheDocument();
    // No saved profile: shows the scenario that zeroes the fee.
    expect(within(cost).getByText("R$ 0/ano")).toBeInTheDocument();

    const returns = screen.getByRole("region", { name: "Retorno e viagem" });
    expect(within(returns).getByText("Ganhos?")).toBeInTheDocument();
    expect(within(returns).getByText("Investback")).toBeInTheDocument();
    expect(within(returns).getByText("1,20%")).toBeInTheDocument();
    expect(within(returns).getByText("2 visitas/ano")).toBeInTheDocument();
    expect(within(returns).getAllByText("Sala própria do cartão").length).toBeGreaterThan(0);
    expect(within(returns).getByText("Premium")).toBeInTheDocument();
  });

  it("computes the effective fee against the saved profile", () => {
    const profile: SpendingProfile = {
      monthlyDomesticBrl: 2000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "cashback" },
    };
    render(<CardDetailSections card={picpayBlack} profile={profile} />);

    const cost = screen.getByRole("region", { name: "Custo efetivo" });
    expect(within(cost).getByText("R$ 0 no 1º ano")).toBeInTheDocument();
    expect(within(cost).getByText(/Depois R\$ 89,00\/mês\./)).toBeInTheDocument();
  });

  it("renders the raw catalog notes as editorial notes, not structured rows", () => {
    render(<CardDetailSections card={picpayBlack} profile={null} />);

    const notes = screen.getByRole("region", { name: "Notas do catálogo" });
    expect(within(notes).getByText("1.2% cashback")).toBeInTheDocument();
    expect(within(notes).getByText("1º ano grátis para clientes selecionados")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Observações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Verificação" })).not.toBeInTheDocument();
  });
});
