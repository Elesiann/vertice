import { expect, test } from "@playwright/test";
import {
  cardOptionsResponse,
  catalogResponse,
  fulfillJson,
  recommendationErrorResponse,
} from "./fixtures";

test.describe("golden path", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/cards/options", async (route) => {
      await fulfillJson(route, { json: cardOptionsResponse });
    });
    await page.route("**/cards/catalog**", async (route) => {
      await fulfillJson(route, { json: catalogResponse });
    });
    await page.route("**/score-lab/recommendations", async (route) => {
      await fulfillJson(route, { json: recommendationErrorResponse });
    });
  });

  test("home renders and links to the form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /calcular/i }).first()).toBeVisible();
  });

  test("input form is reachable from the header CTA", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /calcular/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/input$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("results page surfaces a structured error from the API", async ({ page }) => {
    await page.goto("/input");
    await page.getByLabel(/quanto você gasta por mês no brasil/i).fill("5000");
    await page.getByLabel(/quanto você gasta por mês no exterior/i).fill("200");
    await page.getByRole("button", { name: /calcular/i }).click();
    await expect(page).toHaveURL(/\/results$/);
    await expect(page.getByText(/nenhum cartão se encaixa nessas condições/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("unknown route renders the 404 page", async ({ page }) => {
    await page.goto("/nao-existe");
    await expect(page.getByRole("heading", { name: /página não encontrada/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /voltar para a home/i })).toBeVisible();
  });
});
