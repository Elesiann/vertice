import { expect, test } from "@playwright/test";
import {
  cardDetailAlpha,
  cardDetailBeta,
  cardOptionsResponse,
  catalogResponse,
  fulfillJson,
} from "./fixtures";

test.describe("catalog smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/cards/options", async (route) => {
      await fulfillJson(route, { json: cardOptionsResponse });
    });
    await page.route("**/cards/catalog**", async (route) => {
      await fulfillJson(route, { json: catalogResponse });
    });
    await page.route("**/cards/card-alpha", async (route) => {
      await fulfillJson(route, { json: cardDetailAlpha });
    });
    await page.route("**/cards/card-beta", async (route) => {
      await fulfillJson(route, { json: cardDetailBeta });
    });
  });

  test("catalog lists stubbed cards", async ({ page }) => {
    await page.goto("/cards");
    await expect(page.getByText("Cartão Alpha")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Cartão Beta")).toBeVisible();
  });

  test("clicking a card opens the detail page", async ({ page }) => {
    await page.goto("/cards");
    await page.getByText("Cartão Alpha").first().click();
    await expect(page).toHaveURL(/\/cards\/card-alpha$/);
    await expect(page.getByRole("heading", { name: "Cartão Alpha" })).toBeVisible();
  });

  test("compare page renders empty state without selected ids", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
