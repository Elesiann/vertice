// Minimal API fixtures used by Playwright route stubs. They satisfy
// `src/lib/api-schemas.ts` (zod runtime validation), so the SPA renders
// the real UI without hitting the live API. Keep them small but valid;
// extend per-spec when a test needs richer data.

import type { Route } from "@playwright/test";

export const catalogCardA = {
  id: "card-alpha",
  name: "Cartão Alpha",
  bank: "other",
  brand: "visa",
  tier: "platinum",
  pointsProgram: "livelo",
  annualFeeBrl: 540,
  hasLoungeAccess: true,
  hasTravelInsurance: true,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
  hasInvestback: false,
  cashbackRatePercent: 0,
  pointsPerUsdDomestic: 2.4,
  pointsPerUsdInternational: 4.8,
} as const;

export const catalogCardB = {
  id: "card-beta",
  name: "Cartão Beta",
  bank: "other",
  brand: "mastercard",
  tier: "infinite",
  pointsProgram: "smiles",
  annualFeeBrl: 1080,
  hasLoungeAccess: true,
  hasTravelInsurance: true,
  hasFreeCheckedBaggage: true,
  hasZeroIof: true,
  hasInvestback: false,
  pointsPerUsdDomestic: 3.5,
  pointsPerUsdInternational: 5.0,
} as const;

export const catalogResponse = {
  cards: [catalogCardA, catalogCardB],
  catalogVersion: "e2e",
  count: 2,
  filters: {},
};

export const cardDetailAlpha = {
  ...catalogCardA,
  loungeAccess: { unlimited: true, network: "priority-pass" },
  benefits: [],
  verification: {
    sourceUrl: "https://example.com/card-alpha",
    verifiedAt: "2026-05-01T00:00:00.000Z",
  },
};

export const cardDetailBeta = {
  ...catalogCardB,
  loungeAccess: { unlimited: true, network: "priority-pass" },
  benefits: [],
  verification: {
    sourceUrl: "https://example.com/card-beta",
    verifiedAt: "2026-05-01T00:00:00.000Z",
  },
};

export const cardOptionsResponse = {
  cards: [
    { id: catalogCardA.id, name: catalogCardA.name, bank: catalogCardA.bank },
    { id: catalogCardB.id, name: catalogCardB.name, bank: catalogCardB.bank },
  ],
  catalogVersion: "e2e",
};

// The recommendation flow has a heavy schema. For the golden-path test we
// return a structured error envelope, which exercises the post-input render
// loop end-to-end and asserts the error UX. A full happy-path recommendation
// fixture would belong in its own spec.
export const recommendationErrorResponse = {
  ok: false,
  error: {
    code: "NO_ELIGIBLE_CARDS",
    message: "Nenhum cartão se encaixa nessas condições.",
  },
};

interface RouteFulfillJson {
  status?: number;
  json: unknown;
}

export const fulfillJson = async (
  route: Route,
  { status = 200, json }: RouteFulfillJson,
): Promise<void> => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(json),
  });
};
