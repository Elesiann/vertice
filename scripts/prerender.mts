/**
 * Snapshots every prerenderable route into static HTML at dist/<route>/index.html.
 *
 * Flow:
 *   1. Boot Vite preview programmatically on a free port (serves dist/).
 *   2. Resolve route list = static pages + every card id from /cards/options
 *      (fail-soft: empty list if API down).
 *   3. Spin up N parallel Chromium contexts; each pops routes from a shared
 *      queue, navigates, waits for `window.__PRERENDER_READY__` + network idle,
 *      captures `<html>` outerHTML, sanitizes, writes the file.
 *   4. For /cards/:id, gate writes on `data-snapshot-status="ok"` so partial
 *      failures (API down for a single card) don't ship error pages.
 *
 * Failure posture:
 *   - Up to 5% of routes may fail without blocking the build (those URLs fall
 *     back to the SPA shell via public/_redirects).
 *   - >5% failures → exit 1 (build halts).
 *
 * Skip prerender entirely (fast local iteration): PRERENDER_SKIP=1 pnpm build.
 */

import { chromium, type Browser, type Page } from "@playwright/test";
import { preview, type PreviewServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { fetchCardIds } from "./lib/fetch-card-ids.mts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "..", "dist");

// Static routes safe to prerender (deterministic, no required URL state).
const STATIC_ROUTES = ["/", "/input", "/sobre", "/privacidade", "/termos"] as const;

// Default to 2 because hitting /cards/<id> across 126 cards from 4 contexts at
// once trips backpressure on the API and silently degrades card pages to the
// error state. Override via PRERENDER_CONCURRENCY when the target API is local
// or known to handle higher concurrency.
const CONCURRENCY = Math.max(1, Number(process.env.PRERENDER_CONCURRENCY ?? "2"));
const READY_TIMEOUT_MS = 15_000;
const NETWORKIDLE_TIMEOUT_MS = 8_000;
const NAV_TIMEOUT_MS = 20_000;
const FAILURE_THRESHOLD = 0.05;

interface SnapshotFailure {
  route: string;
  reason: string;
}

const getFreePort = (): Promise<number> =>
  new Promise<number>((res, rej) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", rej);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => {
          res(port);
        });
      } else {
        srv.close(() => {
          rej(new Error("could not allocate port"));
        });
      }
    });
  });

/**
 * Strips runtime-only attributes that would otherwise pollute the serialized
 * DOM (helmet's marker, framer-motion's will-change hints, snapshot status).
 *
 * Also removes `<link rel="modulepreload">` tags injected at runtime: when
 * React Router resolves a lazy route or main.tsx fires its idle Sentry import,
 * the browser appends modulepreload hints to `<head>`. Vite's own emitted
 * preloads don't carry `as="script"`; runtime ones do. Leaving them in the
 * snapshot would force every visitor to download HomePage + api + (worst of
 * all) the ~150kB vendor-sentry chunk on the LCP-critical path, undoing the
 * idle-load gate in main.tsx.
 */
const sanitize = (html: string): string =>
  html
    .replace(/\sdata-react-helmet="true"/g, "")
    .replace(/\sdata-snapshot-status="[^"]*"/g, "")
    .replace(/<link rel="modulepreload" as="script"[^>]*>/g, "");

const snapshot = async (
  page: Page,
  baseUrl: string,
  route: string,
): Promise<{ html: string }> => {
  // Reset per-route browser state so localStorage from a previous route can't
  // bleed into the snapshot (e.g. a saved profile changing /input output).
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* noop */
    }
  });

  await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  await page.waitForFunction(
    () => (window as Window & { __PRERENDER_READY__?: boolean }).__PRERENDER_READY__ === true,
    null,
    { timeout: READY_TIMEOUT_MS },
  );
  await page.waitForLoadState("networkidle", { timeout: NETWORKIDLE_TIMEOUT_MS }).catch(() => {
    /* networkidle is best-effort; SWR mounts may keep trickling */
  });

  // Card detail pages must be in the "ok" state to ship — otherwise we'd
  // freeze the loading skeleton or an error panel into static HTML.
  if (route.startsWith("/cards/")) {
    const status = await page.evaluate(
      () => document.querySelector("[data-snapshot-status]")?.getAttribute("data-snapshot-status"),
    );
    if (status !== "ok") throw new Error(`snapshot-status=${status ?? "missing"}`);
  }

  const html = await page.evaluate(
    () => "<!doctype html>\n" + document.documentElement.outerHTML,
  );
  return { html: sanitize(html) };
};

/**
 * For path `/foo`: write to `dist/foo.html` instead of `dist/foo/index.html`.
 * Cloudflare Pages' "Pretty URLs" serves `<path>.html` directly for `/path`
 * requests with no redirect. Writing to `dist/foo/index.html` instead causes
 * a 308 from `/foo` to `/foo/`, costing 50–100ms on mobile.
 *
 * For nested paths like `/cards/<id>`: write to `dist/cards/<id>.html`. The
 * `cards/` directory is created if needed.
 */
const writeRouteFile = async (route: string, html: string): Promise<string> => {
  let outPath: string;
  if (route === "/") {
    outPath = join(DIST, "index.html");
  } else {
    const stripped = route.replace(/^\//, "").replace(/\/$/, "");
    outPath = join(DIST, `${stripped}.html`);
    await mkdir(dirname(outPath), { recursive: true });
  }
  await writeFile(outPath, html, "utf8");
  return outPath;
};

const runWorker = async (
  browser: Browser,
  baseUrl: string,
  queue: string[],
  failures: SnapshotFailure[],
  total: number,
): Promise<void> => {
  const ctx = await browser.newContext({
    bypassCSP: true,
    viewport: { width: 1280, height: 800 },
  });
  // Drop noise that would stall networkidle for no SEO/LCP gain.
  await ctx.route("**/cloudflareinsights.com/**", (r) => r.abort());
  await ctx.route("**/static.cloudflareinsights.com/**", (r) => r.abort());
  await ctx.route("**/*.sentry.io/**", (r) => r.abort());
  await ctx.route("**/*.ingest.sentry.io/**", (r) => r.abort());

  const page = await ctx.newPage();

  for (;;) {
    const route = queue.shift();
    if (route === undefined) break;
    const index = total - queue.length;
    try {
      const { html } = await snapshot(page, baseUrl, route);
      const path = await writeRouteFile(route, html);
      console.log(`[prerender] ${String(index)}/${String(total)} ok  ${route} → ${path}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ route, reason });
      console.warn(`[prerender] ${String(index)}/${String(total)} fail ${route} (${reason})`);
    }
  }

  await ctx.close();
};

const main = async (): Promise<void> => {
  if (process.env.PRERENDER_SKIP === "1") {
    console.log("[prerender] PRERENDER_SKIP=1, exiting.");
    return;
  }

  const port = await getFreePort();
  let server: PreviewServer | undefined;
  let browser: Browser | undefined;

  try {
    server = await preview({
      preview: { port, host: "127.0.0.1", strictPort: true },
    });
    const baseUrl = `http://127.0.0.1:${String(port)}`;
    console.log(`[prerender] preview serving from ${baseUrl}`);

    const cardIds = await fetchCardIds().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[prerender] could not fetch card ids (${message}); only static routes will be prerendered.`,
      );
      return [] as readonly string[];
    });

    const routes: string[] = [
      ...STATIC_ROUTES,
      ...cardIds.map((id) => `/cards/${id}`),
    ];
    const total = routes.length;
    const failures: SnapshotFailure[] = [];

    browser = await chromium.launch({ headless: true });

    const queue = [...routes];
    const concurrency = Math.min(CONCURRENCY, queue.length);
    const t0 = Date.now();
    await Promise.all(
      Array.from({ length: concurrency }, () =>
        runWorker(browser as Browser, baseUrl, queue, failures, total),
      ),
    );
    const elapsedMs = Date.now() - t0;

    const ok = total - failures.length;
    console.log(
      `[prerender] done: ${String(ok)}/${String(total)} routes ok, ${String(failures.length)} failed in ${String(Math.round(elapsedMs / 1000))}s (concurrency=${String(concurrency)}).`,
    );

    if (failures.length > 0 && failures.length / total > FAILURE_THRESHOLD) {
      console.error(
        `[prerender] failure rate ${String(((failures.length / total) * 100).toFixed(1))}% exceeds threshold ${String(FAILURE_THRESHOLD * 100)}%.`,
      );
      for (const f of failures) console.error(`  - ${f.route}: ${f.reason}`);
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) {
      await new Promise<void>((res) => {
        server.httpServer.close(() => {
          res();
        });
      });
    }
  }
};

void main();
