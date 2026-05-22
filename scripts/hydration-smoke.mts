/**
 * Loads each prerendered route in a real browser and asserts that no React
 * hydration warning ("did not match", "Hydration failed") is printed to the
 * console. Run after the prerender pipeline as part of phase-8 verification.
 */

import { chromium } from "@playwright/test";

const BASE = process.env.PREVIEW_URL ?? "http://127.0.0.1:8792";

// Mix of prerendered (file match → hydrate) and SPA-fallback (no file → main.tsx
// wipes and createRoots) routes. Both must be hydration-warning-free.
const ROUTES = [
  "/",
  "/input",
  "/sobre",
  "/privacidade",
  "/termos",
  "/cards/nubank-ultravioleta",
  "/cards/itau-uniclass-visa-signature-pontos",
  "/cards/c6-graphene-world-legend",
  "/results",
  "/compare",
  "/this-route-does-not-exist",
];

const HYDRATION_SIGNATURES = [
  "Hydration failed",
  "did not match",
  "Text content does not match",
  "Hydration completed but contains mismatches",
];

const main = async (): Promise<void> => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ bypassCSP: true });
  const page = await ctx.newPage();

  const violations: { route: string; message: string }[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || msg.type() === "warning") {
      if (HYDRATION_SIGNATURES.some((s) => text.includes(s))) {
        violations.push({ route: page.url(), message: text });
      }
    }
  });
  page.on("pageerror", (err) => {
    if (HYDRATION_SIGNATURES.some((s) => err.message.includes(s))) {
      violations.push({ route: page.url(), message: err.message });
    }
  });

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 15_000 });
    // Give React a moment to surface hydration warnings into the console.
    await page.waitForTimeout(200);
    console.log(`[hydration-smoke] ok ${route}`);
  }

  await browser.close();

  if (violations.length > 0) {
    console.error(`[hydration-smoke] ${String(violations.length)} hydration warning(s):`);
    for (const v of violations) console.error(`  - ${v.route}\n    ${v.message}`);
    process.exit(1);
  }
  console.log(`[hydration-smoke] ${String(ROUTES.length)} routes clean.`);
};

void main();
