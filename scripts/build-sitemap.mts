/**
 * Regenerates public/sitemap.xml from the static page list + every card id
 * returned by /cards/options. Runs as a prebuild hook (see package.json).
 *
 * Failure mode: when the API is unreachable or returns an unexpected shape,
 * the script logs a warning and exits 0 without touching the existing
 * sitemap. Deploys never break because of this script; they ship the
 * previously-generated sitemap, just slightly stale.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = join(__dirname, "..", "public", "sitemap.xml");

const SITE_ORIGIN = "https://vertice.cards";
const API_URL = process.env.VITE_API_URL ?? "https://api.vertice.cards";
const FETCH_TIMEOUT_MS = 5000;

interface CardOption {
  id: string;
  name: string;
  bank: string;
}

interface CardsOptionsResponse {
  cards: CardOption[];
  catalogVersion?: string;
}

interface StaticUrl {
  loc: string;
  changefreq: string;
  priority: string;
}

const STATIC_URLS: StaticUrl[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/input", changefreq: "monthly", priority: "0.9" },
  { loc: "/cards", changefreq: "weekly", priority: "0.8" },
  { loc: "/compare", changefreq: "monthly", priority: "0.6" },
  { loc: "/sobre", changefreq: "monthly", priority: "0.4" },
  { loc: "/privacidade", changefreq: "yearly", priority: "0.3" },
  { loc: "/termos", changefreq: "yearly", priority: "0.3" },
];

const urlEntry = (path: string, changefreq: string, priority: string): string =>
  `  <url>\n    <loc>${SITE_ORIGIN}${path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const buildSitemap = (cardIds: readonly string[]): string => {
  const entries = [
    ...STATIC_URLS.map((u) => urlEntry(u.loc, u.changefreq, u.priority)),
    ...cardIds.map((id) => urlEntry(`/cards/${id}`, "monthly", "0.5")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
};

const fetchCardIds = async (): Promise<readonly string[]> => {
  const response = await fetch(`${API_URL}/cards/options`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`status ${String(response.status)}`);
  const data = (await response.json()) as unknown;
  if (
    typeof data !== "object" ||
    data === null ||
    !("cards" in data) ||
    !Array.isArray((data as CardsOptionsResponse).cards)
  ) {
    throw new Error("invalid /cards/options shape");
  }
  const cards = (data as CardsOptionsResponse).cards;
  const ids = cards
    .map((c) => c.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .sort();
  if (ids.length === 0) throw new Error("no cards returned");
  return ids;
};

const main = async (): Promise<void> => {
  try {
    const cardIds = await fetchCardIds();
    writeFileSync(SITEMAP_PATH, buildSitemap(cardIds), "utf8");
    console.log(
      `[build-sitemap] wrote ${String(STATIC_URLS.length + cardIds.length)} URLs (${String(cardIds.length)} cards) to public/sitemap.xml`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[build-sitemap] could not refresh sitemap (${message}); keeping existing file.`,
    );
  }
};

void main();
