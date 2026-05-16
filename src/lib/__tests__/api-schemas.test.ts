import { describe, expect, it } from "vitest";
import {
  cardCatalogResponseSchema,
  cardsOptionsResponseSchema,
  publicCardDetailSchema,
  recommendationResponseSchema,
} from "@/lib/api-schemas";

// Minimal valid recommendation body, the shape the API actually returns
// (before the schema transform maps `data` → `envelope`).
const recommendationBody = {
  ok: true,
  data: {
    topStack: {
      cards: [{ id: "alpha", name: "Alpha", bank: "other", pointsProgram: "cashback" }],
      yearOneNetValueBrl: 1234,
    },
    alternatives: [],
    leaderboardsByAxis: [],
    isReturnDecisionTight: false,
    travelTranslation: { kind: "cashback", valueBrl: 1234 },
    shoutout: "Top stack",
  },
  catalogVersion: "v-test",
  solverVersion: "s-test",
} as const;

const catalogCard = {
  id: "card-alpha",
  name: "Alpha",
  bank: "other",
  brand: "visa",
  tier: "platinum",
  pointsProgram: "livelo",
  annualFeeBrl: 540,
  hasLoungeAccess: true,
  hasTravelInsurance: true,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
} as const;

describe("recommendationResponseSchema", () => {
  it("parses a success body and lifts data into an envelope", () => {
    const parsed = recommendationResponseSchema.safeParse(recommendationBody);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.ok).toBe(true);
    if (!parsed.data.ok) return;
    expect(parsed.data.envelope.catalogVersion).toBe("v-test");
    expect(parsed.data.envelope.solverVersion).toBe("s-test");
    expect(parsed.data.envelope.recommendation.topStack.yearOneNetValueBrl).toBe(1234);
    // Defaults applied by inner schema
    expect(parsed.data.envelope.recommendation.topStack.confidence).toBe("medium");
    expect(parsed.data.envelope.recommendation.topStack.warnings).toEqual([]);
  });

  it("accepts unknown extra fields (forward-compatibility via .loose())", () => {
    const parsed = recommendationResponseSchema.safeParse({
      ...recommendationBody,
      futureField: "added later by the backend",
      data: { ...recommendationBody.data, futureMetric: 42 },
    });
    expect(parsed.success).toBe(true);
  });

  it("parses an error response with a Solver error code", () => {
    const parsed = recommendationResponseSchema.safeParse({
      ok: false,
      error: { code: "NO_ELIGIBLE_CARDS", message: "Nada bate" },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.ok).toBe(false);
    if (parsed.data.ok) return;
    expect(parsed.data.error.code).toBe("NO_ELIGIBLE_CARDS");
    expect(parsed.data.error.message).toBe("Nada bate");
  });

  it("rejects a success body missing required envelope metadata", () => {
    const { solverVersion: _solverVersion, ...partial } = recommendationBody;
    const parsed = recommendationResponseSchema.safeParse(partial);
    expect(parsed.success).toBe(false);
  });

  it("rejects a topStack with no cards", () => {
    const parsed = recommendationResponseSchema.safeParse({
      ...recommendationBody,
      data: { ...recommendationBody.data, topStack: { cards: [], yearOneNetValueBrl: 0 } },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an error body without a message", () => {
    const parsed = recommendationResponseSchema.safeParse({
      ok: false,
      error: { code: "EMPTY_CATALOG", message: "" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("cardCatalogResponseSchema", () => {
  it("parses a valid catalog response", () => {
    const parsed = cardCatalogResponseSchema.safeParse({
      cards: [catalogCard],
      catalogVersion: "v-test",
      count: 1,
      filters: { tier: "platinum" },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.cards).toHaveLength(1);
    expect(parsed.data.cards[0]?.name).toBe("Alpha");
  });

  it("applies the default filters object when omitted", () => {
    const parsed = cardCatalogResponseSchema.safeParse({
      cards: [catalogCard],
      catalogVersion: "v-test",
      count: 1,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.filters).toEqual({});
  });

  it("rejects when annualFeeBrl is negative", () => {
    const parsed = cardCatalogResponseSchema.safeParse({
      cards: [{ ...catalogCard, annualFeeBrl: -10 }],
      catalogVersion: "v-test",
      count: 1,
      filters: {},
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects when catalogVersion is empty", () => {
    const parsed = cardCatalogResponseSchema.safeParse({
      cards: [catalogCard],
      catalogVersion: "",
      count: 1,
      filters: {},
    });
    expect(parsed.success).toBe(false);
  });
});

describe("publicCardDetailSchema", () => {
  it("parses a minimal card detail (extends catalog card)", () => {
    const parsed = publicCardDetailSchema.safeParse(catalogCard);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.id).toBe("card-alpha");
  });

  it("rejects when required card fields are missing", () => {
    const { hasZeroIof: _ignore, ...partial } = catalogCard;
    const parsed = publicCardDetailSchema.safeParse(partial);
    expect(parsed.success).toBe(false);
  });
});

describe("cardsOptionsResponseSchema", () => {
  it("parses a valid options response", () => {
    const parsed = cardsOptionsResponseSchema.safeParse({
      cards: [{ id: "alpha", name: "Alpha", bank: "nubank" }],
      catalogVersion: "v-test",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.cards).toHaveLength(1);
  });

  it("rejects when bank is not in the enum", () => {
    const parsed = cardsOptionsResponseSchema.safeParse({
      cards: [{ id: "alpha", name: "Alpha", bank: "wakanda-bank" }],
      catalogVersion: "v-test",
    });
    expect(parsed.success).toBe(false);
  });
});
