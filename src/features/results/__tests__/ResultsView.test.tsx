import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { catalog } from "@/data/catalog";
import { ResultsView } from "@/features/results/ResultsView";
import type { SpendingProfile } from "@/types";

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderResults = (profile: SpendingProfile | null): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={profile} />
        <ResultsView />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("ResultsView", () => {
  it("shows empty state when no profile is set", () => {
    renderResults(null);

    expect(screen.getByRole("heading", { name: /Nada pra mostrar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /formulário/i })).toBeInTheDocument();
  });

  it("renders the full reveal when a profile is seeded", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Quadro de opções por eixo/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Tradução em viagens/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /Comparar com meus cartões atuais/i }),
    ).not.toBeInTheDocument();
  });

  it("renders current-card comparison only when currentCardIds is informed", async () => {
    const currentCardId = catalog.cards[0]?.id;
    if (!currentCardId) throw new Error("test catalog must include at least one card");

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
      currentCardIds: [currentCardId],
    });

    expect(
      await screen.findByRole("region", { name: /Comparar com meus cartões atuais/i }),
    ).toBeInTheDocument();
  });

  it("does not render contradictory accessibility copy", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(/exige correntista.*não exige correntista/i)).not.toBeInTheDocument();
  });

  it("renders an error state when the solver rejects the profile", async () => {
    renderResults({
      monthlyDomesticBrl: 0,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });

    expect(
      await screen.findByRole("heading", { name: /Não conseguimos recomendar/i }),
    ).toBeInTheDocument();
  });
});
