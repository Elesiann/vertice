import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrentVsRecommended } from "@/features/results/CurrentVsRecommended";
import { formatBrl } from "@/lib/format";
import type { ComparisonNarrative } from "@/lib/comparison-narrative";

const variantANarrative: ComparisonNarrative = {
  variant: "current-negative",
  diagnosis: [
    `A maior diferença está na anuidade: ${formatBrl(1068)} no atual, ${formatBrl(0)} no recomendado.`,
    `Seu cartão atual fica negativo em ${formatBrl(318)}/ano. O recomendado renderia ${formatBrl(720)} líquido/ano sem anuidade.`,
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
      currentFeeDetail: {
        status: "charged",
        annualBrl: 1068,
        routes: [
          { kind: "invest", amountBrl: 50000 },
          { kind: "spend", amountBrl: 8000 },
        ],
        spendShortfallAvailableBrl: 5000,
      },
      recommendedFeeDetail: {
        status: "waived",
        annualBrl: 0,
        routes: [
          { kind: "spend", amountBrl: 5000 },
          { kind: "invest", amountBrl: 50000 },
        ],
      },
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
        { label: "Sala VIP", count: 12, demanded: 12, unitBrl: 200, totalBrl: 2400 },
        { label: "Seguro", count: 5, demanded: 5, unitBrl: 350, totalBrl: 1750 },
      ],
      recommendedBreakdown: [
        { label: "Sala VIP", count: 12, demanded: 12, unitBrl: 200, totalBrl: 2400 },
      ],
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

const cappedLoungeNarrative: ComparisonNarrative = {
  ...travelNarrative,
  rows: [
    {
      key: "travel-benefit",
      label: "Benefício de viagem",
      currentValueBrl: 800,
      recommendedValueBrl: 1600,
      currentBreakdown: [{ label: "Sala VIP", count: 4, demanded: 8, unitBrl: 200, totalBrl: 800 }],
      recommendedBreakdown: [
        { label: "Sala VIP", count: 8, demanded: 8, unitBrl: 200, totalBrl: 1600 },
      ],
      tone: "recommended-better",
    },
    { key: "net", label: "Líquido anual", currentValueBrl: 800, recommendedValueBrl: 1600 },
  ],
};

const rowEl = (rowLabel: string): HTMLElement =>
  screen.getByText(rowLabel).closest("tr") as HTMLElement;

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
      screen.getByText(/A maior diferença está na anuidade: R\$\s?1\.068,00 no atual/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/O recomendado renderia R\$\s?720,00 líquido\/ano sem anuidade/),
    ).toBeInTheDocument();
  });

  it("renders the column headers with both card names", () => {
    render(
      <CurrentVsRecommended
        narrative={variantANarrative}
        currentLabel="Nubank Ultravioleta"
        recommendedLabel="PicPay Card Black"
      />,
    );
    expect(screen.getByText("SEU CARTÃO")).toBeInTheDocument();
    expect(screen.getByText("RECOMENDADO")).toBeInTheDocument();
    expect(screen.getByText("Nubank Ultravioleta")).toBeInTheDocument();
    expect(screen.getByText("PicPay Card Black")).toBeInTheDocument();
  });

  it("marks the recommended column with a gold pill, none on the current column", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    // the "RECOMENDADO" eyebrow lives inside a gold pill
    expect(screen.getByText("RECOMENDADO").closest(".bg-gold-soft")).toHaveClass("text-gold");
    // the current ("SEU CARTÃO") column carries no gold pill
    const seuCartaoTh = screen.getByText("SEU CARTÃO").closest("th") as HTMLElement;
    expect(seuCartaoTh.querySelector(".bg-gold-soft")).toBeNull();
  });

  it("renders each row label and the formatted values per side", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(screen.getByText("Cashback")).toBeInTheDocument();
    // the annual-fee row label is a toggle button (it carries expandable detail)
    expect(screen.getByRole("button", { name: "Anuidade" })).toBeInTheDocument();
    expect(screen.getByText("Líquido anual")).toBeInTheDocument();
    expect(screen.getByText(/750,00/)).toBeInTheDocument();
    // 720 appears in three places: diagnosis sentence + cashback rec cell + net rec cell.
    expect(screen.getAllByText(/720,00/).length).toBe(3);
    expect(screen.getByText(/-R\$\s?1\.068,00/)).toBeInTheDocument();
    // R$ 0,00 shows in the annual-fee recommended cell and once in the diagnosis sentence.
    expect(screen.getAllByText(/R\$\s?0,00/).length).toBe(2);
    expect(screen.getByText(/-R\$\s?318,00/)).toBeInTheDocument();
  });

  it("renders the difference verdict in accent, never in danger", () => {
    render(
      <CurrentVsRecommended narrative={variantANarrative} currentLabel="A" recommendedLabel="B" />,
    );
    expect(screen.getByText("Diferença anual")).toBeInTheDocument();
    const verdict = screen.getByText(/1\.038,00/);
    expect(verdict).toHaveClass("text-accent");
    expect(verdict).not.toHaveClass("text-danger");
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

  describe("per-row winner/loser styling", () => {
    it("emphasizes the winning value and recesses the losing one", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      const cashback = rowEl("Cashback");
      // current (R$ 750,00) wins over recommended (R$ 720,00)
      expect(within(cashback).getByText(/750,00/)).toHaveClass("font-medium", "text-ink");
      expect(within(cashback).getByText(/720,00/)).toHaveClass("font-normal", "text-ink-muted");
    });

    it("marks only the winning value with a screen-reader 'melhor' note", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      const cashback = rowEl("Cashback");
      expect(
        within(within(cashback).getByText(/750,00/)).getByText(/melhor neste item/),
      ).toBeInTheDocument();
      expect(
        within(within(cashback).getByText(/720,00/)).queryByText(/melhor neste item/),
      ).toBeNull();
    });

    it("keeps the net row bold on both sides and the negative current net in warning", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      const net = rowEl("Líquido anual");
      const currentNet = within(net).getByText(/-R\$\s?318,00/);
      expect(currentNet).toHaveClass("font-semibold", "text-warning");
      expect(currentNet).not.toHaveClass("text-danger");
      const recommendedNet = within(net).getByText(/720,00/);
      expect(recommendedNet).toHaveClass("font-semibold", "text-ink");
      expect(within(recommendedNet).getByText(/melhor neste item/)).toBeInTheDocument();
    });

    it("leaves a tied row neutral — no emphasis, no marker", () => {
      const tied: ComparisonNarrative = {
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
      render(<CurrentVsRecommended narrative={tied} currentLabel="A" recommendedLabel="B" />);
      const fxCells = within(rowEl("FX/IOF")).getAllByText(/-R\$\s?444,00/);
      expect(fxCells).toHaveLength(2);
      for (const cell of fxCells) {
        expect(cell).toHaveClass("text-ink", "font-normal");
        expect(within(cell).queryByText(/melhor neste item/)).toBeNull();
      }
    });
  });

  describe("annual-fee detail (progressive disclosure)", () => {
    // The expanded annual-fee row renders a full-width labelled panel — not cells in the value columns.
    const feePanel = (): HTMLElement => {
      const el = document.querySelector<HTMLElement>('[aria-label="Detalhe da anuidade"]');
      if (el === null) throw new Error("annual-fee detail panel not rendered");
      return el;
    };
    const storyFor = (eyebrow: string): HTMLElement => {
      const div = within(feePanel()).getByText(eyebrow).closest("div");
      if (div === null) throw new Error(`fee story for ${eyebrow} not found`);
      return div;
    };
    const expandAnuidade = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
      await user.click(screen.getByRole("button", { name: "Anuidade" }));
    };

    it("hides the fee detail panel until the row is expanded", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      const toggle = screen.getByRole("button", { name: "Anuidade" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(document.querySelector('[aria-label="Detalhe da anuidade"]')).toBeNull();

      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(feePanel()).toBeInTheDocument();
    });

    it("shows a status headline per card with the waiver condition below it", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);

      const current = storyFor("SEU CARTÃO");
      // current card charges its fee — headline + the two escape routes + the spend shortfall
      expect(within(current).getByText(/Cobrada · R\$\s?1\.068,00\/ano/)).toBeInTheDocument();
      expect(
        within(current).getByText(
          /isenta com R\$\s?50\.000,00 investidos no banco ou R\$\s?8\.000,00\/mês em gastos/,
        ),
      ).toBeInTheDocument();
      expect(within(current).getByText(/você gasta R\$\s?5\.000,00\/mês/)).toBeInTheDocument();

      const recommended = storyFor("RECOMENDADO");
      // recommended card is waived — "Isenta" headline, conditions without the "isenta com" hypothetical
      expect(within(recommended).getByText("Isenta")).toBeInTheDocument();
      expect(
        within(recommended).getByText(
          /com R\$\s?5\.000,00\/mês em gastos ou R\$\s?50\.000,00 investidos no banco/,
        ),
      ).toBeInTheDocument();
      expect(within(recommended).queryByText(/você gasta/)).toBeNull();
    });

    it("labels each side with an eyebrow, not the card names", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="Nubank Ultravioleta"
          recommendedLabel="PicPay Card Black"
        />,
      );
      await expandAnuidade(user);
      const panel = feePanel();
      expect(within(panel).getByText("SEU CARTÃO")).toBeInTheDocument();
      expect(within(panel).getByText("RECOMENDADO")).toBeInTheDocument();
      expect(within(panel).queryByText("Nubank Ultravioleta")).toBeNull();
      expect(within(panel).queryByText("PicPay Card Black")).toBeNull();
    });

    it("shows the break-even/ROI line under the charged card when both values are set", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);
      expect(
        within(storyFor("SEU CARTÃO")).getByText(
          /paga-se com R\$\s?7\.120,00\/mês em gastos · cada R\$ 1 retorna 3,59x/,
        ),
      ).toBeInTheDocument();
      expect(within(storyFor("RECOMENDADO")).queryByText(/paga-se com/)).toBeNull();
    });

    it("shows the break-even line alone when only the break-even spend is set", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={{ ...variantANarrative, currentRoiMultiple: null }}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);
      const current = storyFor("SEU CARTÃO");
      expect(
        within(current).getByText(/paga-se com R\$\s?7\.120,00\/mês em gastos/),
      ).toBeInTheDocument();
      expect(within(current).queryByText(/cada R\$ 1/)).toBeNull();
    });

    it("shows the ROI line alone when only the ROI multiple is set", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={{ ...variantANarrative, currentBreakEvenMonthlySpendBrl: null }}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);
      const current = storyFor("SEU CARTÃO");
      expect(within(current).getByText(/cada R\$ 1 de anuidade retorna 3,59x/)).toBeInTheDocument();
      expect(within(current).queryByText(/paga-se com/)).toBeNull();
    });

    it("omits the break-even/ROI line when neither value is set, keeping the conditions", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={narrativeWithoutBreakEven}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);
      const current = storyFor("SEU CARTÃO");
      expect(within(current).queryByText(/paga-se com/)).toBeNull();
      expect(within(current).queryByText(/cada R\$ 1/)).toBeNull();
      expect(within(current).getByText(/Cobrada · R\$\s?1\.068,00\/ano/)).toBeInTheDocument();
    });

    it("never shows the break-even/ROI line under a card that does not charge a fee", async () => {
      const user = userEvent.setup();
      // current card has no fee at all, recommended one charges — break-even/ROI must not leak
      const noFeeCurrent: ComparisonNarrative = {
        ...variantANarrative,
        currentBreakEvenMonthlySpendBrl: 4000,
        currentRoiMultiple: 2.1,
        rows: variantANarrative.rows.map((r) =>
          r.key === "annual-fee"
            ? {
                ...r,
                currentValueBrl: 0,
                recommendedValueBrl: -1680,
                tone: "current-better",
                currentFeeDetail: { status: "no-fee", annualBrl: 0, routes: [] },
                recommendedFeeDetail: {
                  status: "charged",
                  annualBrl: 1680,
                  routes: [{ kind: "invest", amountBrl: 50000 }],
                },
              }
            : r,
        ),
      };
      render(
        <CurrentVsRecommended narrative={noFeeCurrent} currentLabel="A" recommendedLabel="B" />,
      );
      await expandAnuidade(user);
      expect(within(storyFor("SEU CARTÃO")).getByText("Sem anuidade")).toBeInTheDocument();
      expect(within(feePanel()).queryByText(/paga-se com/)).toBeNull();
    });

    it("renders real content (not a bare em-dash) when the recommended card charges a fee", async () => {
      const user = userEvent.setup();
      const chargedFeeNarrative: ComparisonNarrative = {
        ...variantANarrative,
        rows: variantANarrative.rows.map((r) =>
          r.key === "annual-fee"
            ? {
                ...r,
                recommendedValueBrl: -1680,
                tone: "current-better",
                recommendedFeeDetail: {
                  status: "charged",
                  annualBrl: 1680,
                  routes: [{ kind: "invest", amountBrl: 50000 }],
                },
              }
            : r,
        ),
      };
      render(
        <CurrentVsRecommended
          narrative={chargedFeeNarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      await expandAnuidade(user);
      const recommended = storyFor("RECOMENDADO");
      expect(within(recommended).getByText(/Cobrada · R\$\s?1\.680,00\/ano/)).toBeInTheDocument();
      expect(
        within(recommended).getByText(/isenta com R\$\s?50\.000,00 investidos no banco/),
      ).toBeInTheDocument();
      expect(recommended.textContent).not.toBe("—");
    });
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
      expect(btn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Sala VIP")).not.toBeInTheDocument();
      expect(screen.queryByText("Seguro")).not.toBeInTheDocument();
    });

    it("expanding the travel-benefit row reveals each component with count × unit = total format", async () => {
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

      // Sala VIP: count=12, unitBrl=200, totalBrl=2400 — on both sides (same fixture data).
      const salaVipRow = screen.getByText("Sala VIP").closest("tr") as HTMLElement;
      expect(
        within(salaVipRow).getAllByText(/12 acessos × R\$\s?200,00 = R\$\s?2\.400,00/).length,
      ).toBe(2);

      // Seguro: count=5, unitBrl=350, totalBrl=1750 on current; absent → em-dash on recommended.
      const seguroRow = screen.getByText("Seguro").closest("tr") as HTMLElement;
      expect(
        within(seguroRow).getByText(/5 viagens × R\$\s?350,00 = R\$\s?1\.750,00/),
      ).toBeInTheDocument();
      expect(within(seguroRow).getByText("—")).toBeInTheDocument();
    });

    it("shows 'N de M acessos' when the card caps lounge visits below demand", async () => {
      const user = userEvent.setup();
      render(
        <CurrentVsRecommended
          narrative={cappedLoungeNarrative}
          currentLabel="Card A"
          recommendedLabel="Card B"
        />,
      );
      const btn = screen.getByRole("button", { name: /Benefício de viagem/i });
      await user.click(btn);

      const salaVipRow = screen.getByText("Sala VIP").closest("tr") as HTMLElement;
      expect(
        within(salaVipRow).getByText(/4 de 8 acessos × R\$\s?200,00 = R\$\s?800,00/),
      ).toBeInTheDocument();
      // uncapped side renders normally
      expect(
        within(salaVipRow).getByText(/8 acessos × R\$\s?200,00 = R\$\s?1\.600,00/),
      ).toBeInTheDocument();
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
    });

    it("a narrative without a travel-benefit breakdown shows no benefit toggle", () => {
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

  describe("verdict tag under column headers", () => {
    const verdictNarrative: ComparisonNarrative = {
      ...variantANarrative,
      currentVerdict: { kind: "negative", label: "Atenção: tende a custar mais que retorna" },
      recommendedVerdict: { kind: "strong", label: "Forte candidato para este perfil" },
    };

    it("renders the verdict tag under each column header", () => {
      render(
        <CurrentVsRecommended
          narrative={verdictNarrative}
          currentLabel="Nubank Ultravioleta"
          recommendedLabel="PicPay Card Black"
        />,
      );
      const currentTh = screen.getByText("SEU CARTÃO").closest("th") as HTMLElement;
      expect(
        within(currentTh).getByText(/Atenção: tende a custar mais que retorna/),
      ).toBeInTheDocument();
      const recomendadoTh = screen.getByText("RECOMENDADO").closest("th") as HTMLElement;
      expect(
        within(recomendadoTh).getByText(/Forte candidato para este perfil/),
      ).toBeInTheDocument();
    });

    it("paints a negative verdict in warning and a non-negative one in subtle ink", () => {
      render(
        <CurrentVsRecommended narrative={verdictNarrative} currentLabel="A" recommendedLabel="B" />,
      );
      expect(screen.getByText(/Forte candidato para este perfil/)).toHaveClass("text-ink-subtle");
      expect(screen.getByText(/Atenção: tende a custar mais que retorna/)).toHaveClass(
        "text-warning",
      );
    });

    it("paints a viable verdict in subtle ink too", () => {
      render(
        <CurrentVsRecommended
          narrative={{
            ...variantANarrative,
            currentVerdict: { kind: "viable", label: "Pode compensar dependendo do uso" },
          }}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      expect(screen.getByText(/Pode compensar dependendo do uso/)).toHaveClass("text-ink-subtle");
    });

    it("renders no verdict tag when the verdict is absent", () => {
      render(
        <CurrentVsRecommended
          narrative={variantANarrative}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      expect(screen.queryByText(/Atenção: tende a custar/)).toBeNull();
      expect(screen.queryByText(/Forte candidato/)).toBeNull();
    });

    it("renders only the present verdict tag when one side is absent", () => {
      render(
        <CurrentVsRecommended
          narrative={{
            ...variantANarrative,
            recommendedVerdict: { kind: "strong", label: "Forte candidato para este perfil" },
          }}
          currentLabel="A"
          recommendedLabel="B"
        />,
      );
      expect(screen.getByText(/Forte candidato para este perfil/)).toBeInTheDocument();
      expect(screen.queryByText(/Atenção/)).toBeNull();
    });
  });
});
