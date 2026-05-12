import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import type { TravelTranslation as TravelTranslationData } from "@/types";

const redemption: TravelTranslationData = {
  kind: "redemption",
  from: "GRU",
  fromLabel: "São Paulo",
  to: "MIA",
  toLabel: "Miami",
  region: "international",
  cabin: "economy",
  roundTrip: true,
  programId: "smiles",
  pointsCost: 70000,
  compatiblePoints: 150000,
  trips: 2,
  remainingPoints: 10000,
};

describe("TravelTranslation", () => {
  it("renders a redemption with trip count, route, cabin and leftover points", () => {
    render(<TravelTranslation translation={redemption} />);
    expect(screen.getByText(/2 passagens/i)).toBeInTheDocument();
    expect(screen.getByText(/São Paulo/)).toBeInTheDocument();
    expect(screen.getByText(/Miami/)).toBeInTheDocument();
    expect(screen.getByText(/econômica/i)).toBeInTheDocument();
    expect(screen.getByText(/ida e volta/i)).toBeInTheDocument();
    expect(screen.getByText(/10\.000 pontos/)).toBeInTheDocument();
  });

  it("shows the transfer line only when viaProgram is present", () => {
    const { rerender } = render(<TravelTranslation translation={redemption} />);
    expect(screen.queryByText(/transferindo 1:1/i)).not.toBeInTheDocument();
    rerender(<TravelTranslation translation={{ ...redemption, viaProgram: "latam-pass" }} />);
    expect(screen.getByText(/transferindo 1:1 para LATAM Pass/i)).toBeInTheDocument();
  });

  it("renders the value variant without a fabricated trip count", () => {
    render(
      <TravelTranslation
        translation={{ kind: "value", program: "smiles", compatiblePoints: 5000, valueBrl: 125 }}
      />,
    );
    expect(screen.queryByText(/passagem|passagens/i)).not.toBeInTheDocument();
    expect(screen.getByText(/R\$\s?125/)).toBeInTheDocument();
    expect(screen.getByText(/em pontos Smiles/i)).toBeInTheDocument();
  });

  it("renders the cashback variant", () => {
    render(<TravelTranslation translation={{ kind: "cashback", valueBrl: 800 }} />);
    expect(screen.getByText(/R\$\s?800/)).toBeInTheDocument();
    expect(screen.getByText(/cashback/i)).toBeInTheDocument();
  });
});
