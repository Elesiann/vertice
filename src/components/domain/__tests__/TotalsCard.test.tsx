import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TotalsCard } from "@/components/domain/TotalsCard";

describe("TotalsCard", () => {
  it("renders BRL and USD totals with monthly averages", () => {
    render(
      <TotalsCard
        aggregate={{
          periodStart: "2026-04-01",
          periodEnd: "2026-09-30",
          monthsCovered: 6,
          totalDomesticBrl: 12000,
          totalInternationalBrl: 3000,
          totalInternationalUsd: 535.71,
          monthlyAvgDomesticBrl: 2000,
          monthlyAvgInternationalUsd: 89.29,
          ptaxRateUsed: 5.6,
          transactionCount: 247,
          duplicatesRemoved: 0,
          byBank: {},
        }}
      />,
    );

    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByText(/12\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/535\.71/)).toBeInTheDocument();
    expect(screen.getByText(/247 transações/)).toBeInTheDocument();
    expect(screen.getByText(/PTAX 5\.60/)).toBeInTheDocument();
  });
});
