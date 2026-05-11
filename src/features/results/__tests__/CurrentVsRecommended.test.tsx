import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrentVsRecommended } from "@/features/results/CurrentVsRecommended";
import { formatBrl } from "@/lib/format";
import type { ComparisonNarrative } from "@/lib/comparison-narrative";

const variantANarrative: ComparisonNarrative = {
  variant: "current-negative",
  diagnosis: [
    `No seu gasto, seu cartão atual cobra ${formatBrl(1068)} de anuidade e fica negativo em ${formatBrl(318)}/ano.`,
    `O recomendado renderia ${formatBrl(720)} líquido/ano sem anuidade.`,
  ],
  rows: [
    {
      key: "cashback",
      label: "Cashback",
      currentValueBrl: 750,
      recommendedValueBrl: 720,
      tone: "current-better",
    },
    {
      key: "annual-fee",
      label: "Anuidade",
      currentValueBrl: -1068,
      recommendedValueBrl: 0,
      currentSubLabel:
        "cobrada; isentaria com R$ 50.000,00 investidos ou R$ 8.000,00/mês — você gasta R$ 5.000,00/mês",
      recommendedSubLabel:
        "isenta: gasto de R$ 5.000,00/mês satisfaz (alternativa: R$ 50.000,00 investidos)",
      tone: "recommended-better",
    },
    { key: "net", label: "Líquido anual", currentValueBrl: -318, recommendedValueBrl: 720 },
  ],
  verdictBrl: 1038,
  dominantRowKey: "annual-fee",
  monthlySpendBrl: 5000,
  monthlyInternationalUsd: 0,
  currentBreakEvenMonthlySpendBrl: 7120,
  currentRoiMultiple: 3.59,
};

const narrativeWithoutBreakEven: ComparisonNarrative = {
  ...variantANarrative,
  currentBreakEvenMonthlySpendBrl: null,
  currentRoiMultiple: null,
};

describe("CurrentVsRecommended", () => {
  it("renders both diagnosis paragraphs", () => {
    render(
      <CurrentVsRecommended
        narrative={variantANarrative}
        currentLabel="Nubank Ultravioleta"
        recommendedLabel="PicPay Card Black"
      />,
    );
    expect(
      screen.getByText(/seu cartão atual cobra R\$\s?1\.068,00 de anuidade/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/O recomendado renderia R\$\s?720,00 líquido\/ano sem anuidade/),
    ).toBeInTheDocument();
  });

  it("renders the column headers HOJE and RECOMENDADO with both card names", () => {
    render(
      <CurrentVsRecommended
        narrative={variantANarrative}
        currentLabel="Nubank Ultravioleta"
        recommendedLabel="PicPay Card Black"
      />,
    );
    expect(screen.getByText("HOJE")).toBeInTheDocument();
    expect(screen.getByText("RECOMENDADO")).toBeInTheDocument();
    expect(screen.getByText("Nubank Ultravioleta")).toBeInTheDocument();
    expect(screen.getByText("PicPay Card Black")).toBeInTheDocument();
  });

  it("renders each row label and the formatted values per side", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(screen.getByText("Cashback")).toBeInTheDocument();
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
    expect(screen.getByText("Líquido anual")).toBeInTheDocument();
    expect(screen.getByText(/750,00/)).toBeInTheDocument();
    // 720 appears in three places: diagnosis sentence + cashback rec cell + net rec cell.
    expect(screen.getAllByText(/720,00/).length).toBe(3);
    expect(screen.getByText(/-R\$\s?1\.068,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?0,00/)).toBeInTheDocument();
    expect(screen.getByText(/-R\$\s?318,00/)).toBeInTheDocument();
  });

  it("renders the verdict in accent and never in danger", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(screen.getByText("Diferença anual")).toBeInTheDocument();
    const verdict = screen.getByText(/1\.038,00/);
    expect(verdict).toHaveClass("text-accent");
    expect(verdict).not.toHaveClass("text-danger");
  });

  it("colors a negative net row in warning", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    const negativeNet = screen.getByText(/-R\$\s?318,00/);
    expect(negativeNet).toHaveClass("text-warning");
    expect(negativeNet).not.toHaveClass("text-danger");
  });

  it("renders the monthly-spend caption", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(screen.getByText(/Gasto base:\s*R\$\s?5\.000,00\/mês/)).toBeInTheDocument();
  });

  it("appends the international spend to the caption when present", () => {
    render(
      <CurrentVsRecommended
        narrative={{ ...variantANarrative, monthlyInternationalUsd: 1200 }}
        currentLabel="A"
        recommendedLabel="B"
      />,
    );
    expect(
      screen.getByText(/Gasto base:\s*R\$\s?5\.000,00\/mês\s*\+\s*\$1,200\.00\/mês internacional/),
    ).toBeInTheDocument();
  });

  it("renders the annual-fee waiver sub-lines per side", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(
      screen.getByText(
        /cobrada; isentaria com R\$\s?50\.000,00 investidos ou R\$\s?8\.000,00\/mês/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/isenta: gasto de R\$\s?5\.000,00\/mês satisfaz \(alternativa:/),
    ).toBeInTheDocument();
  });

  it("shows the break-even and ROI clause on the current side when both are set", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(
      screen.getByText(
        /a anuidade se paga a partir de R\$\s?7\.120,00\/mês em gastos · cada R\$ 1 retorna 3,59x/,
      ),
    ).toBeInTheDocument();
  });

  it("hides the break-even/ROI clause when both values are null", () => {
    render(
      <CurrentVsRecommended
        narrative={narrativeWithoutBreakEven}
        currentLabel="A"
        recommendedLabel="B"
      />,
    );
    expect(screen.queryByText(/a anuidade se paga a partir de/)).not.toBeInTheDocument();
    expect(screen.queryByText(/cada R\$ 1/)).not.toBeInTheDocument();
  });

  it("shows the ROI clause alone when only currentRoiMultiple is set", () => {
    render(
      <CurrentVsRecommended
        narrative={{ ...variantANarrative, currentBreakEvenMonthlySpendBrl: null }}
        currentLabel="A"
        recommendedLabel="B"
      />,
    );
    expect(screen.getByText(/cada R\$ 1 de anuidade retorna 3,59x/)).toBeInTheDocument();
    expect(screen.queryByText(/a anuidade se paga a partir de/)).not.toBeInTheDocument();
  });
});
