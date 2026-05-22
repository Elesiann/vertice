#!/usr/bin/env node
/**
 * Lighthouse audit script — roda LH contra todas as páginas principais
 * e imprime um relatório completo: scores, CWV, cadeia de rede, audits falhando.
 *
 * Uso: node scripts/lh-audit.mjs [url-base]
 * Padrão: https://vertice.cards
 */
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "https://vertice.cards";

const PAGES = [
  { path: "/", label: "Home" },
  { path: "/input", label: "Input" },
  { path: "/cards/amazon-com-br-mastercard-platinum", label: "Card detail" },
  { path: "/results", label: "Results" },
  {
    path: "/compare?ids=amazon-com-br-mastercard-platinum,bb-ourocard-mastercard-platinum",
    label: "Compare",
  },
];

const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`;

const TMP = join(tmpdir(), "lh-audit");
mkdirSync(TMP, { recursive: true });

// ── helpers ──────────────────────────────────────────────────────────────────

const score = (s) => {
  if (s === null || s === undefined) return "  n/a";
  const n = Math.round(s * 100);
  const icon = n >= 90 ? "✅" : n >= 50 ? "⚠️ " : "❌";
  return `${icon} ${String(n).padStart(3)}`;
};

const flattenChain = (chains, depth = 0) => {
  const lines = [];
  for (const node of Object.values(chains)) {
    const url = (node.url ?? "").replace(BASE, "");
    const ms = node.navStartToEndTime ? `${Math.round(node.navStartToEndTime)}ms` : "";
    const kb = node.transferSize ? `${(node.transferSize / 1024).toFixed(1)}KB` : "";
    lines.push("  ".repeat(depth) + `${url.slice(0, 70)} [${ms}, ${kb}]`);
    if (node.children && Object.keys(node.children).length > 0) {
      lines.push(...flattenChain(node.children, depth + 1));
    }
  }
  return lines;
};

// ── run LH ───────────────────────────────────────────────────────────────────

const runLH = (url, outFile) => {
  const result = spawnSync(
    "npx",
    [
      "lighthouse",
      url,
      "--output=json",
      `--output-path=${outFile}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--quiet",
    ],
    { env: { ...process.env, CHROME_PATH: CHROME }, stdio: "ignore" },
  );
  if (result.status !== 0) throw new Error(`LH exited ${result.status}`);
};

// ── report ───────────────────────────────────────────────────────────────────

const report = (label, r) => {
  const a = r.audits;
  const cats = r.categories;

  console.log("\n" + "═".repeat(60));
  console.log(`  ${label}`);
  console.log("═".repeat(60));

  for (const c of Object.values(cats)) {
    console.log(`  ${c.title.padEnd(20)} ${score(c.score)}`);
  }

  console.log("\n  Core Web Vitals");
  for (const id of [
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interactive",
  ]) {
    const au = a[id];
    if (!au) continue;
    console.log(
      `    ${au.title.padEnd(30)} ${(au.displayValue ?? "—").padEnd(12)} ${score(au.score)}`,
    );
  }

  // Network dependency chain
  const ndtItems = a["network-dependency-tree-insight"]?.details?.items ?? [];
  for (const item of ndtItems) {
    const tree = item.value ?? item;
    if (!tree?.chains) continue;
    const longest = tree.longestChain?.duration;
    console.log(`\n  Cadeia crítica${longest ? ` (máx ${Math.round(longest)}ms)` : ""}`);
    flattenChain(tree.chains).forEach((l) => console.log("  " + l));
  }

  // Render-blocking
  const rb = a["render-blocking-insight"] ?? a["render-blocking-resources"];
  if (rb?.score !== null && rb?.score < 1) {
    console.log(`\n  Render-blocking: ${rb.displayValue ?? ""}`);
    (rb.details?.items ?? []).slice(0, 5).forEach((i) => {
      const url = (i.url ?? "").replace(BASE, "");
      console.log(
        `    ${url.slice(0, 52).padEnd(52)} ${i.wastedMs ? Math.round(i.wastedMs) + "ms" : ""}`,
      );
    });
  }

  // Unused JS / CSS
  for (const id of ["unused-javascript", "unused-css-rules"]) {
    const au = a[id];
    if (!au?.details?.items?.length) continue;
    console.log(`\n  ${au.title}: ${au.displayValue}`);
    au.details.items.slice(0, 5).forEach((i) => {
      const name = (i.url ?? "").split("/").pop()?.slice(0, 40) ?? "";
      console.log(`    ${name.padEnd(42)} ${(i.wastedBytes / 1024).toFixed(1)}KB`);
    });
  }

  // Failing audits
  console.log("\n  Audits falhando");
  Object.values(a)
    .filter((au) => au.score !== null && au.score !== undefined && au.score < 1)
    .sort((x, y) => x.score - y.score)
    .slice(0, 15)
    .forEach((au) => {
      const detail = au.displayValue ? ` — ${au.displayValue}` : "";
      console.log(`    ${score(au.score)}  ${au.title}${detail}`.slice(0, 78));
    });
};

// ── main ─────────────────────────────────────────────────────────────────────

console.log(`\nLighthouse audit → ${BASE}`);
console.log(`Chrome: ${CHROME}\n`);

const jobs = PAGES.map(({ path, label }) => {
  const url = BASE + path;
  const outFile = join(TMP, label.replace(/\W+/g, "-") + ".json");
  return { url, outFile, label };
});

await Promise.all(
  jobs.map(
    ({ url, outFile, label }) =>
      new Promise((resolve) => {
        try {
          process.stdout.write(`  ⏳ ${label}…\r`);
          runLH(url, outFile);
          process.stdout.write(`  ✅ ${label}          \n`);
        } catch (e) {
          process.stdout.write(`  ❌ ${label}: ${e.message?.slice(0, 60)}\n`);
        }
        resolve();
      }),
  ),
);

for (const { outFile, label } of jobs) {
  try {
    const r = JSON.parse(readFileSync(outFile, "utf8"));
    report(label, r);
  } catch {
    console.log(`\n[${label}] falhou ao carregar resultado`);
  }
}

console.log("\n");
