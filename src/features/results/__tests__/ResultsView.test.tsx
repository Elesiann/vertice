import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
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
    expect(screen.getByRole("region", { name: /Stack recomendado/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Tradução em viagens/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver o math/i })).toBeInTheDocument();
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
