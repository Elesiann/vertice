import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const travelNarrative: ComparisonNarrative = {
  variant: "current-positive",
  diagnosis: ["Seu cartão atual rende R$ 1.000,00/ano.", "O recomendado renderia mais."],
  rows: [
    {
      key: "travel-benefit",
      label: "Benefício de viagem",
      currentValueBrl: 4150,
      recommendedValueBrl: 2400,
      currentBreakdown: [
        { label: "Sala VIP", valueBrl: 2400 },
        { label: "Seguro", valueBrl: 1750 },
      ],
      recommendedBreakdown: [{ label: "Sala VIP", valueBrl: 2400 }],
      tone: "current-better",
    },
    { key: "net", label: "Líquido anual", currentValueBrl: 4150, recommendedValueBrl: 2400 },
  ],
  verdictBrl: -1750,
  dominantRowKey: "travel-benefit",
  monthlySpendBrl: 5000,
  monthlyInternationalUsd: 0,
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

  it("the recommended column header shows a gold 'recomendado' pill", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    const pill = screen.getByText(/^recomendado$/);
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("text-gold");
    expect(pill).toHaveClass("bg-gold-soft");
    const recommendedTh = screen.getByText("RECOMENDADO").closest("th") as HTMLElement;
    expect(within(recommendedTh).getByText(/^recomendado$/)).toBeInTheDocument();
  });

  it("the HOJE column header has no winner pill", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    const hojeTh = screen.getByText("HOJE").closest("th") as HTMLElement;
    expect(within(hojeTh).queryByText(/^recomendado$/)).toBeNull();
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

  it("shows the break-even clause alone when only currentBreakEvenMonthlySpendBrl is set", () => {
    render(
      <CurrentVsRecommended
        narrative={{ ...variantANarrative, currentRoiMultiple: null }}
        currentLabel="A"
        recommendedLabel="B"
      />,
    );
    expect(
      screen.getByText(/a anuidade se paga a partir de R\$\s?7\.120,00\/mês em gastos/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/cada R\$ 1/)).not.toBeInTheDocument();
  });

  describe("travel-benefit row expandable breakdown", () => {
    it("has a toggle button collapsed by default, breakdown labels not visible", () => {
      render(
        <CurrentVsRecommended
          narrative={travelNarrative}
          currentLabel="Card A"
          recommendedLabel="Card B"
        />,
      );
      const btn = screen.getByRole("button", { name: /Benefício de viagem/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Sala VIP")).not.toBeInTheDocument();
      expect(screen.queryByText("Seguro")).not.toBeInTheDocument();
    });

    it("expanding the travel-benefit row reveals the breakdown with correct values", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={travelNarrative}
          currentLabel="Card A"
          recommendedLabel="Card B"
        />,
      );
      const btn = screen.getByRole("button", { name: /Benefício de viagem/i });
      await user.click(btn);

      expect(btn).toHaveAttribute("aria-expanded", "true");

      expect(screen.getByText("Sala VIP")).toBeInTheDocument();
      expect(screen.getByText("Seguro")).toBeInTheDocument();

      // Sala VIP: both sides show R$ 2.400,00
      const salaVipRow = screen.getByText("Sala VIP").closest("tr") as HTMLElement;
      expect(salaVipRow).not.toBeNull();
      expect(within(salaVipRow).getAllByText(/R\$\s?2\.400,00/).length).toBe(2);

      // Seguro: current side shows R$ 1.750,00; recommended side shows em-dash
      const seguroRow = screen.getByText("Seguro").closest("tr") as HTMLElement;
      expect(seguroRow).not.toBeNull();
      expect(within(seguroRow).getByText(/R\$\s?1\.750,00/)).toBeInTheDocument();
      expect(within(seguroRow).getByText("—")).toBeInTheDocument();
    });

    it("collapsing again hides the breakdown and resets aria-expanded", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={travelNarrative}
          currentLabel="Card A"
          recommendedLabel="Card B"
        />,
      );
      const btn = screen.getByRole("button", { name: /Benefício de viagem/i });
      await user.click(btn);
      await user.click(btn);

      expect(btn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Sala VIP")).not.toBeInTheDocument();
      expect(screen.queryByText("Seguro")).not.toBeInTheDocument();
    });

    it("a narrative without a travel-benefit breakdown shows no toggle", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      expect(
        screen.queryByRole("button", { name: /Benefício de viagem/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Sala VIP")).not.toBeInTheDocument();
    });
  });

  describe("cell tints by tone", () => {
    // variantANarrative rows:
    //   cashback  tone:"current-better"   → current(750) positive, recommended(720) negative
    //   annual-fee tone:"recommended-better" → current(-1068) negative, recommended(0) positive
    //   net       (no tone)               → no bg-cell-* class

    it("current-better row: current cell gets bg-cell-positive, recommended gets bg-cell-negative", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      // cashback current = R$ 750,00
      const currentCashback = screen.getByText(/750,00/);
      expect(currentCashback).toHaveClass("bg-cell-positive");
      expect(currentCashback).not.toHaveClass("bg-cell-negative");

      // cashback recommended = R$ 720,00 appears multiple times; find the table cell (td)
      const allSevenTwenty = screen.getAllByText(/720,00/);
      const cashbackRecommendedTd = allSevenTwenty.find((el) => el.tagName === "TD");
      expect(cashbackRecommendedTd).toBeDefined();
      expect(cashbackRecommendedTd).toHaveClass("bg-cell-negative");
      expect(cashbackRecommendedTd).not.toHaveClass("bg-cell-positive");
    });

    it("recommended-better row: current cell gets bg-cell-negative, recommended gets bg-cell-positive", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      // annual-fee current = -R$ 1.068,00 (unambiguous)
      const currentFee = screen.getByText(/-R\$\s?1\.068,00/);
      expect(currentFee).toHaveClass("bg-cell-negative");
      expect(currentFee).not.toHaveClass("bg-cell-positive");

      // annual-fee recommended = R$ 0,00 (unambiguous)
      const recommendedFee = screen.getByText(/R\$\s?0,00/);
      expect(recommendedFee).toHaveClass("bg-cell-positive");
      expect(recommendedFee).not.toHaveClass("bg-cell-negative");
    });

    it("net row has no bg-cell-* class on either side", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      const netRow = screen.getByText("Líquido anual").closest("tr") as HTMLElement;
      expect(netRow).not.toBeNull();
      const [netCurrentTd, netRecommendedTd] = within(netRow).getAllByRole("cell");
      expect(netCurrentTd?.className).not.toMatch(/bg-cell-/);
      expect(netRecommendedTd?.className).not.toMatch(/bg-cell-/);
    });

    it("tied row: both cells get bg-cell-neutral", () => {
      const tiedNarrative: ComparisonNarrative = {
        ...variantANarrative,
        rows: [
          {
            key: "fx-iof",
            label: "FX/IOF",
            currentValueBrl: -444,
            recommendedValueBrl: -444,
            tone: "tie",
          },
          { key: "net", label: "Líquido anual", currentValueBrl: -444, recommendedValueBrl: -444 },
        ],
      };
      render(
        <CurrentVsRecommended narrative={tiedNarrative} currentLabel="A" recommendedLabel="B" />,
      );
      // Both fx-iof cells show -R$ 444,00; they are the two TDs in the fx-iof row
      const fxRow = screen.getByText("FX/IOF").closest("tr") as HTMLElement;
      expect(fxRow).not.toBeNull();
      const cells = within(fxRow).getAllByText(/-R\$\s?444,00/);
      expect(cells).toHaveLength(2);
      for (const cell of cells) {
        expect(cell).toHaveClass("bg-cell-neutral");
      }
    });
  });
});
