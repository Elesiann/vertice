import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { cardDetailAlpha, cardOptionsResponse, catalogResponse, fulfillJson } from "./fixtures";

// Stubs the network calls every "live data" route makes so axe scans against
// the real rendered UI instead of skeleton/loading states. Patterns mirror
// catalog-smoke (any host ending in the API path). Tests must navigate via
// the catalog and click, never page.goto() directly to /cards/:id, because
// the same glob matches browser navigation to that path and would return
// JSON in place of the SPA shell.
const stubCatalogApi = async (page: Page): Promise<void> => {
  await page.route("**/cards/options", async (route) => {
    await fulfillJson(route, { json: cardOptionsResponse });
  });
  await page.route("**/cards/catalog**", async (route) => {
    await fulfillJson(route, { json: catalogResponse });
  });
  await page.route("**/cards/card-alpha", async (route) => {
    await fulfillJson(route, { json: cardDetailAlpha });
  });
};

// Reports violations as id + impact + per-node target/summary. Compact in
// the passing case (assertion silent), informative in the failing case
// (toEqual diff shows exactly which selectors and which failureSummary).
const scanForA11yViolations = async (page: Page, label: string): Promise<void> => {
  const results = await new AxeBuilder({ page }).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target.join(", "),
      summary: node.failureSummary ?? "",
    })),
  }));
  expect(summary, `axe violations on ${label}`).toEqual([]);
};

test.describe("accessibility (axe-core)", () => {
  // Framer-motion reveals animate opacity 0->1 on mount, and axe samples
  // mid-animation pixels (lighter than the final color due to bg blending) as
  // false-positive color-contrast failures. Emulating reduced motion makes the
  // app skip the JS-driven animation via useReducedMotion() and the CSS
  // collapses transitions to 0.01ms. axe then scans the stable final paint.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("home renders accessibly", async ({ page }) => {
    await stubCatalogApi(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/");
  });

  test("input form renders accessibly", async ({ page }) => {
    await stubCatalogApi(page);
    await page.goto("/input");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/input");
  });

  test("catalog list renders accessibly", async ({ page }) => {
    await stubCatalogApi(page);
    await page.goto("/cards");
    await expect(page.getByText("Cartão Alpha")).toBeVisible({ timeout: 10_000 });
    await scanForA11yViolations(page, "/cards");
  });

  test("card detail renders accessibly", async ({ page }) => {
    await stubCatalogApi(page);
    // Navigate through the catalog rather than page.goto("/cards/card-alpha"),
    // because the **/cards/card-alpha route stub also matches the browser
    // navigation request and returns JSON in place of the SPA shell.
    await page.goto("/cards");
    await page.getByText("Cartão Alpha").first().click();
    await expect(page).toHaveURL(/\/cards\/card-alpha$/);
    await expect(page.getByRole("heading", { name: "Cartão Alpha" })).toBeVisible();
    await scanForA11yViolations(page, "/cards/:id");
  });

  test("compare empty state renders accessibly", async ({ page }) => {
    await stubCatalogApi(page);
    await page.goto("/compare");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/compare");
  });

  test("about page renders accessibly", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/sobre");
  });

  test("privacy page renders accessibly", async ({ page }) => {
    await page.goto("/privacidade");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/privacidade");
  });

  test("terms page renders accessibly", async ({ page }) => {
    await page.goto("/termos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/termos");
  });

  test("not-found page renders accessibly", async ({ page }) => {
    await page.goto("/non-existent-path");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scanForA11yViolations(page, "/404");
  });
});
