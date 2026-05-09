import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { CompareTable } from "@/features/compare/CompareTable";
import type { PublicCardDetail, Recommendation, SpendingProfile } from "@/types";

const makeCard = (id: string, name: string, annualFeeBrl: number): PublicCardDetail => ({
  id,
  name,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const cards = [makeCard("a", "Cartão Alpha", 1200), makeCard("b", "Cartão Beta", 800)];

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
  currentCardIds: ["a"],
};

const Seed = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const Wrap = ({ children, profile }: { children: ReactNode; profile: SpendingProfile | null }) => (
  <MemoryRouter>
    <SessionProvider>
      <Seed profile={profile} />
      {children}
    </SessionProvider>
  </MemoryRouter>
);

const recommendation = (overrides?: Partial<Recommendation>): Recommendation => ({
  topStack: {
    cards: [
      {
        id: "a",
        name: "Cartão Alpha",
        bank: "nubank",
        pointsProgram: "smiles",
        requiresRelationship: "open",
      },
    ],
    allocation: [{ cardId: "a", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
    liquidity: "high",
    yearOneAnnualFeeBrl: 1200,
    yearOneWelcomeBonusPoints: 0,
    yearOneEarnedPoints: 0,
    yearOneTotalPoints: 0,
    yearOneTotalValueBrl: 0,
    yearOneNetValueBrl: 0,
    warnings: [],
    confidence: "high",
  },
  alternatives: [],
  leaderboardsByAxis: [],
  isReturnDecisionTight: false,
  travelTranslation: {
    program: "smiles",
    flight: "n/a",
    pointsRequired: 0,
    compatiblePoints: 0,
    trips: 0,
    remainingPoints: 0,
  },
  shoutout: "",
  ...overrides,
});

const stubFetch = (rec: Recommendation): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: rec,
            catalogVersion: "test",
            solverVersion: "test",
          }),
      }),
    ),
  );
};

describe("CompareTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders both card names", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(screen.getByText("Cartão Alpha")).toBeInTheDocument();
    expect(screen.getByText("Cartão Beta")).toBeInTheDocument();
  });

  it("renders the annual fee row", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);
  });

  it("shows current-card badge when column card is in the session profile", async () => {
    render(
      <Wrap profile={profile}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(await screen.findByText("Seu cartão")).toBeInTheDocument();
  });

  it("omits current-card badge when no compared card is current", () => {
    render(
      <Wrap profile={{ ...profile, currentCardIds: ["other-card"] }}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(screen.queryByText("Seu cartão")).not.toBeInTheDocument();
  });

  it("hides equal rows when toggle is enabled", async () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );

    await userEvent.click(screen.getByLabelText("Esconder linhas iguais"));

    expect(screen.queryByText("Programa")).not.toBeInTheDocument();
    expect(screen.getByText("Anuidade")).toBeInTheDocument();
  });

  it("disables hide-equal toggle when there is only one card", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={[makeCard("single", "Cartão Solo", 1200)]} />
      </Wrap>,
    );

    expect(screen.getByLabelText("Esconder linhas iguais")).toBeDisabled();
  });

  it("hides the modeled-return row when profile is null", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(screen.queryByText(/Retorno modelado pro seu perfil/i)).not.toBeInTheDocument();
  });

  it("shows modeled return row with values and highlights the winner", async () => {
    stubFetch(
      recommendation({
        scoreLab: {
          scenarioId: "test",
          preference: "any",
          ptaxRate: 5,
          ptaxSource: "manual",
          ptaxFetchedAt: "2026-05-09T00:00:00.000Z",
          scoreLabVersion: "test",
          evaluatedStacks: 2,
          netReturnLeaderDiffers: false,
          netReturnLeader: recommendation().topStack,
          nearUnlocks: [],
          notes: [],
          singleCardNetReturnByCardId: { a: 500, b: 1500 },
        },
      }),
    );
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
        }}
      >
        <CompareTable cards={cards} />
      </Wrap>,
    );

    const label = await screen.findByText(/Retorno modelado pro seu perfil/i);
    const row = label.closest("tr");
    expect(row).not.toBeNull();
    expect(row?.textContent).toMatch(/500,00\/ano/);
    expect(row?.textContent).toMatch(/1\.500,00\/ano/);

    const cells = row?.querySelectorAll("td") ?? [];
    expect(cells[0]?.className).not.toMatch(/text-accent/);
    expect(cells[1]?.className).toMatch(/text-accent/);
  });

  it("shows skeleton cells while modeled returns are loading", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<unknown>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
        }}
      >
        <CompareTable cards={cards} />
      </Wrap>,
    );

    const label = await screen.findByText(/Retorno modelado pro seu perfil/i);
    const row = label.closest("tr");
    expect(row?.querySelectorAll(".animate-pulse").length).toBe(cards.length);

    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: recommendation() }),
    });
  });
});
