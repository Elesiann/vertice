import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
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
  travelTranslation: { kind: "cashback", valueBrl: 0 },
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
    expect(screen.getAllByText("Cartão Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cartão Beta").length).toBeGreaterThan(0);
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

  it("hides equal rows when the text toggle is enabled", async () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Esconder linhas iguais" }));

    expect(screen.queryByText("Programa")).not.toBeInTheDocument();
    expect(screen.getAllByText("Anuidade").length).toBeGreaterThan(0);
  });

  it("starts with equal rows hidden when comparing three or more cards", async () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={[...cards, makeCard("c", "Cartão Charlie", 1000)]} />
      </Wrap>,
    );

    expect(screen.queryByText("Programa")).not.toBeInTheDocument();
    expect(screen.getByText(/linhas iguais escondidas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "mostrar todas" }));
    expect(screen.getAllByText("Programa").length).toBeGreaterThan(0);
  });

  it("does not show an equal-row toggle when there is only one card", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={[makeCard("single", "Cartão Solo", 1200)]} />
      </Wrap>,
    );

    expect(
      screen.queryByRole("button", { name: "Esconder linhas iguais" }),
    ).not.toBeInTheDocument();
  });

  it("renders an Imprimir button that triggers window.print", () => {
    const printSpy = vi.fn();
    vi.stubGlobal("print", printSpy);
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    const button = screen.getByRole("button", { name: /imprimir/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("hides the modeled-return row when profile is null", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    expect(screen.queryByText(/Retorno no seu perfil/i)).not.toBeInTheDocument();
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

    const labels = await screen.findAllByText(/Retorno no seu perfil/i);
    const row = labels.map((el) => el.closest("tr")).find((tr) => tr !== null);
    expect(row).not.toBeNull();
    expect(row?.textContent).toMatch(/500,00\/ano/);
    expect(row?.textContent).toMatch(/1\.500,00\/ano/);

    const cells = row?.querySelectorAll("td") ?? [];
    expect(cells[0]?.className).toMatch(/text-ink/);
    expect(cells[0]?.className).toMatch(/font-semibold/);
    expect(cells[1]?.className).toMatch(/text-ink-muted/);
    expect(cells[1]?.className).not.toMatch(/font-semibold/);
    expect(screen.getAllByText("Vencedor da comparação")).toHaveLength(2);
    expect(
      screen
        .getAllByText("Vencedor da comparação")
        .some((label) => label.closest(".bg-gold-soft\\/35") !== null),
    ).toBe(true);
  });

  it("shows modeled point-program reward value instead of an empty cashback cell", async () => {
    const topStack = {
      ...recommendation().topStack,
      cards: [
        {
          id: "a",
          name: "Cartão Alpha",
          bank: "nubank",
          pointsProgram: "nomad-pass",
        },
      ],
      yearOneTotalValueBrl: 900,
      yearOneNetValueBrl: 900,
      scoreLab: {
        modeledAnnual: {
          earnedPoints: 10_000,
          welcomeBonusPoints: 0,
          totalPoints: 10_000,
          grossValueBrl: 900,
          benefitUtilityBrl: 0,
          recurringAnnualFeeBrl: 0,
          internationalCostBrl: 0,
          netReturnBrl: 900,
        },
      } as NonNullable<Recommendation["topStack"]["scoreLab"]>,
    };
    stubFetch(
      recommendation({
        topStack,
        scoreLab: {
          scenarioId: "test",
          preference: "any",
          ptaxRate: 5,
          ptaxSource: "manual",
          ptaxFetchedAt: "2026-05-09T00:00:00.000Z",
          scoreLabVersion: "test",
          evaluatedStacks: 2,
          netReturnLeaderDiffers: false,
          netReturnLeader: topStack,
          nearUnlocks: [],
          notes: [],
          singleCardNetReturnByCardId: { a: 900, b: 750 },
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
        <CompareTable
          cards={[
            { ...makeCard("a", "Cartão Alpha", 0), pointsProgram: "nomad-pass" },
            {
              ...makeCard("b", "Cartão Beta", 0),
              pointsProgram: "cashback",
              cashbackRatePercent: 0.0125,
            },
          ]}
        />
      </Wrap>,
    );

    const rewardLabels = await screen.findAllByText("Recompensa");
    const rewardRow = rewardLabels.map((el) => el.closest("tr")).find((tr) => tr !== null);
    expect(rewardRow).not.toBeNull();
    expect(rewardRow?.textContent).toMatch(/≈ 1,50% em valor/);
    expect(rewardRow?.textContent).toMatch(/Nomad Pass/);
    expect(rewardRow?.textContent).toMatch(/1,25%/);
  });

  it("does not mark any card as recommended when modeled return is tied", async () => {
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
          singleCardNetReturnByCardId: { a: 1500, b: 1500 },
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

    const labels = await screen.findAllByText(/Retorno no seu perfil/i);
    const row = labels.map((el) => el.closest("tr")).find((tr) => tr !== null);
    const cells = row?.querySelectorAll("td") ?? [];
    expect(cells[0]?.className).toMatch(/text-ink/);
    expect(cells[0]?.className).not.toMatch(/font-semibold/);
    expect(cells[1]?.className).toMatch(/text-ink/);
    expect(cells[1]?.className).not.toMatch(/font-semibold/);
    expect(screen.queryByText("Vencedor da comparação")).not.toBeInTheDocument();
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

    const labels = await screen.findAllByText(/Retorno no seu perfil/i);
    const row = labels.map((el) => el.closest("tr")).find((tr) => tr !== null);
    expect(row?.querySelectorAll(".animate-pulse").length).toBe(cards.length);

    await act(async () => {
      resolveFetch({
        ok: true,
        json: () => Promise.resolve({ ok: true, data: recommendation() }),
      });
      await Promise.resolve();
    });
  });

  it("renders mobile cards layout with same data", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    // Mobile layout exists: each card is a <section> with the card's aria-label
    expect(screen.getByRole("region", { name: "Cartão Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cartão Beta" })).toBeInTheDocument();
  });

  it("mobile layout marks winner cells with ink and muted loser cells", () => {
    render(
      <Wrap profile={null}>
        <CompareTable cards={cards} />
      </Wrap>,
    );
    const beta = screen.getByRole("region", { name: "Cartão Beta" });
    // Beta has the lower fee (800 vs 1200) → it's the fee winner
    const betaFeeRow = Array.from(beta.querySelectorAll("dd")).find((el) =>
      el.textContent.includes("800"),
    );
    expect(betaFeeRow?.className).toMatch(/text-ink/);
    expect(betaFeeRow?.className).toMatch(/font-semibold/);
    const alpha = screen.getByRole("region", { name: "Cartão Alpha" });
    const alphaFeeRow = Array.from(alpha.querySelectorAll("dd")).find((el) =>
      el.textContent.includes("1.200"),
    );
    expect(alphaFeeRow?.className).toMatch(/text-ink-muted/);
    expect(alphaFeeRow?.className).not.toMatch(/font-semibold/);
  });
});
