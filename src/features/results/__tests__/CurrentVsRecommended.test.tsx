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
    { key: "cashback", label: "Cashback", currentValueBrl: 750, recommendedValueBrl: 720 },
    { key: "annual-fee", label: "Anuidade", currentValueBrl: -1068, recommendedValueBrl: 0 },
    { key: "net", label: "Net anual", currentValueBrl: -318, recommendedValueBrl: 720 },
  ],
  verdictBrl: 1038,
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
    expect(screen.getByText("Net anual")).toBeInTheDocument();
    expect(screen.getByText(/750,00/)).toBeInTheDocument();
    // 720 appears in three places: diagnosis sentence + cashback rec cell + net rec cell
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
});
