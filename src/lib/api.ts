import { fail, ok, type Result } from "@/lib/result";
import {
  cardCatalogResponseSchema,
  cardsOptionsResponseSchema,
  publicCardDetailSchema,
  recommendationResponseSchema,
} from "@/lib/api-schemas";
import type {
  CardCatalogResponse,
  CardOption,
  CatalogFilters,
  RecommendationEnvelope,
  PublicCardDetail,
  PublicCatalogCard,
  SolverError,
  SpendingProfile,
} from "@/types";

const getApiUrl = (): string => {
  const value: unknown = Reflect.get(import.meta.env, "VITE_API_URL");
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (import.meta.env.PROD) {
    throw new Error("VITE_API_URL is required for production builds.");
  }
  return "http://localhost:3333";
};

const API_URL = getApiUrl();

const apiUrl = (path: string): string => `${API_URL}${path}`;

const networkError = (): SolverError => ({
  code: "NETWORK_ERROR",
  message: "Não foi possível conectar à API de recomendação.",
});

const contractError = (): SolverError => ({
  code: "CONTRACT_ERROR",
  message:
    "A API respondeu com um formato inesperado. A recomendação não foi exibida para evitar um resultado parcial.",
});

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error("Invalid JSON response");
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

interface RetryOptions {
  retries?: number | undefined;
  timeoutMs?: number | undefined;
  baseDelayMs?: number | undefined;
  signal?: AbortSignal | undefined;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const combineSignals = (signals: AbortSignal[]): AbortSignal => {
  if (signals.length === 1 && signals[0] !== undefined) return signals[0];
  const controller = new AbortController();
  for (const source of signals) {
    if (source.aborted) {
      controller.abort(source.reason);
      return controller.signal;
    }
    source.addEventListener(
      "abort",
      () => {
        controller.abort(source.reason);
      },
      { once: true },
    );
  }
  return controller.signal;
};

/**
 * fetch with retry + per-attempt timeout. Retries on network failure and 5xx
 * (with exponential backoff). Aborts immediately if the caller's signal fires.
 * 4xx and 2xx responses are returned to the caller without retry.
 */
export const fetchWithRetry = async (
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {},
): Promise<Response> => {
  const { retries = 2, timeoutMs = 8000, baseDelayMs = 300, signal } = opts;
  const attemptRequest = async (attempt: number): Promise<Response> => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signals: AbortSignal[] = [timeoutSignal];
    if (signal !== undefined) signals.push(signal);
    const requestSignal = combineSignals(signals);
    try {
      const response = await fetch(url, { ...init, signal: requestSignal });
      const status = response.status;
      const isServerError = typeof status === "number" && status >= 500 && status < 600;
      if (!isServerError || attempt >= retries) {
        return response;
      }
    } catch (error) {
      if (signal?.aborted === true) throw error;
      if (attempt >= retries) throw error;
      if (!isAbortError(error) && !(error instanceof TypeError)) throw error;
    }
    await sleep(baseDelayMs * 2 ** attempt, signal);
    return attemptRequest(attempt + 1);
  };
  return attemptRequest(0);
};

interface RequestOptions {
  signal?: AbortSignal | undefined;
}

export const fetchCardOptions = async (opts: RequestOptions = {}): Promise<CardOption[]> => {
  const response = await fetchWithRetry(apiUrl("/cards/options"), {}, { signal: opts.signal });
  if (!response.ok) throw new Error("Failed to fetch card options");
  const parsed = cardsOptionsResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new Error("Invalid /cards/options response");
  return parsed.data.cards;
};

export const fetchRecommendation = async (
  profile: SpendingProfile,
  ptaxRate?: number,
  opts: RequestOptions = {},
): Promise<Result<RecommendationEnvelope, SolverError>> => {
  try {
    const response = await fetchWithRetry(
      apiUrl("/score-lab/recommendations"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          ...(ptaxRate !== undefined ? { ptaxRate } : {}),
        }),
      },
      { signal: opts.signal },
    );
    const parsed = recommendationResponseSchema.safeParse(await readJson(response));
    if (!parsed.success) return fail(contractError());
    if (!parsed.data.ok) {
      return fail(parsed.data.error);
    }
    if (!response.ok) return fail(networkError());
    return ok(parsed.data.envelope);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof Error && error.message === "Invalid JSON response") {
      return fail(contractError());
    }
    return fail(networkError());
  }
};

export const fetchCardCatalog = async (
  filters: CatalogFilters = {},
  opts: RequestOptions = {},
): Promise<CardCatalogResponse> => {
  const params = new URLSearchParams();
  if (filters.bank !== undefined) params.set("bank", filters.bank);
  if (filters.tier !== undefined) params.set("tier", filters.tier);
  if (filters.brand !== undefined) params.set("brand", filters.brand);
  if (filters.hasLounge !== undefined) params.set("hasLounge", String(filters.hasLounge));
  if (filters.hasCashback !== undefined) params.set("hasCashback", String(filters.hasCashback));
  if (filters.hasInvestback !== undefined) {
    params.set("hasInvestback", String(filters.hasInvestback));
  }
  if (filters.requiresRelationship !== undefined && filters.requiresRelationship.length > 0) {
    params.set("requiresRelationship", filters.requiresRelationship.join(","));
  }
  if (filters.minAnnualFee !== undefined) params.set("minAnnualFee", String(filters.minAnnualFee));
  if (filters.maxAnnualFee !== undefined) params.set("maxAnnualFee", String(filters.maxAnnualFee));
  if (filters.search !== undefined && filters.search.length > 0)
    params.set("search", filters.search);
  const qs = params.toString();
  const response = await fetchWithRetry(
    apiUrl(`/cards/catalog${qs ? `?${qs}` : ""}`),
    {},
    { signal: opts.signal },
  );
  if (!response.ok) throw new Error("Failed to fetch card catalog");
  const parsed = cardCatalogResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new Error("Invalid /cards/catalog response");
  const body = parsed.data;
  const cards = applyClientSideCatalogFilters(body.cards, filters);
  return {
    ...body,
    cards,
    count: cards.length,
    filters: { ...body.filters, ...filters },
  };
};

const applyClientSideCatalogFilters = (
  cards: PublicCatalogCard[],
  filters: CatalogFilters,
): PublicCatalogCard[] =>
  cards.filter((card) => {
    // TODO: backend filter — keep these checks until /cards/catalog applies the expanded filters.
    if (
      filters.hasInvestback !== undefined &&
      (card.hasInvestback === true) !== filters.hasInvestback
    ) {
      return false;
    }
    if (
      filters.requiresRelationship !== undefined &&
      filters.requiresRelationship.length > 0 &&
      (card.requiresRelationship === undefined ||
        card.requiresRelationship === "private" ||
        !filters.requiresRelationship.includes(card.requiresRelationship))
    ) {
      return false;
    }
    if (filters.minAnnualFee !== undefined && card.annualFeeBrl < filters.minAnnualFee) {
      return false;
    }
    if (filters.maxAnnualFee !== undefined && card.annualFeeBrl > filters.maxAnnualFee) {
      return false;
    }
    return true;
  });

export const fetchCardDetail = async (
  id: string,
  opts: RequestOptions = {},
): Promise<Result<PublicCardDetail, SolverError>> => {
  try {
    const response = await fetchWithRetry(
      apiUrl(`/cards/${encodeURIComponent(id)}`),
      {},
      { signal: opts.signal },
    );
    if (response.status === 404) {
      return fail({ code: "CARD_NOT_FOUND", message: "Cartão não encontrado." });
    }
    if (!response.ok) {
      return fail({ code: "NETWORK_ERROR", message: "Não foi possível carregar o cartão." });
    }
    const parsed = publicCardDetailSchema.safeParse(await readJson(response));
    if (!parsed.success) return fail(contractError());
    return ok(parsed.data);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof Error && error.message === "Invalid JSON response") {
      return fail(contractError());
    }
    return fail({ code: "NETWORK_ERROR", message: "Não foi possível conectar à API." });
  }
};
