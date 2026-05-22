/**
 * Fetches the canonical list of card ids from /cards/options. Shared by
 * build-sitemap (prebuild) and prerender (postbuild) so both stay in sync.
 */

const DEFAULT_TIMEOUT_MS = 5000;

interface CardOption {
  id: string;
  name: string;
  bank: string;
}

interface CardsOptionsResponse {
  cards: CardOption[];
  catalogVersion?: string;
}

export const fetchCardIds = async (
  apiUrl: string = process.env.VITE_API_URL ?? "https://api.vertice.cards",
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<readonly string[]> => {
  const response = await fetch(`${apiUrl}/cards/options`, {
    signal: AbortSignal.timeout(timeoutMs),
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
