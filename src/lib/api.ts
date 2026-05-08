import { fail, ok, type Result } from "@/lib/result";
import type {
  CardCatalogResponse,
  CardOption,
  CatalogFilters,
  PublicCardDetail,
  Recommendation,
  SolverError,
  SpendingProfile,
} from "@/types";

const getApiUrl = (): string => {
  const value: unknown = Reflect.get(import.meta.env, "VITE_API_URL");
  return typeof value === "string" && value.length > 0 ? value : "http://localhost:3333";
};

const API_URL = getApiUrl();

interface CardsOptionsResponse {
  cards: CardOption[];
  catalogVersion: string;
}

interface RecommendationSuccessResponse {
  ok: true;
  data: Recommendation;
  catalogVersion: string;
  solverVersion: string;
}

interface RecommendationErrorResponse {
  ok: false;
  error: SolverError;
}

const apiUrl = (path: string): string => `${API_URL}${path}`;

const networkError = (): SolverError => ({
  code: "NETWORK_ERROR",
  message: "Não foi possível conectar à API de recomendação.",
});

export const fetchCardOptions = async (): Promise<CardOption[]> => {
  const response = await fetch(apiUrl("/cards/options"));
  if (!response.ok) throw new Error("Failed to fetch card options");
  const body = (await response.json()) as CardsOptionsResponse;
  return body.cards;
};

export const fetchRecommendation = async (
  profile: SpendingProfile,
  ptaxRate?: number,
): Promise<Result<Recommendation, SolverError>> => {
  try {
    const response = await fetch(apiUrl("/score-lab/recommendations"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        profile,
        ...(ptaxRate !== undefined ? { ptaxRate } : {}),
      }),
    });
    const body = (await response.json()) as
      | RecommendationSuccessResponse
      | RecommendationErrorResponse;
    if (!response.ok || !body.ok) {
      return fail(!body.ok ? body.error : networkError());
    }
    return ok(body.data);
  } catch {
    return fail(networkError());
  }
};

export const fetchCardCatalog = async (
  filters: CatalogFilters = {},
): Promise<CardCatalogResponse> => {
  const params = new URLSearchParams();
  if (filters.bank !== undefined) params.set("bank", filters.bank);
  if (filters.tier !== undefined) params.set("tier", filters.tier);
  if (filters.brand !== undefined) params.set("brand", filters.brand);
  if (filters.hasLounge !== undefined) params.set("hasLounge", String(filters.hasLounge));
  if (filters.hasCashback !== undefined) params.set("hasCashback", String(filters.hasCashback));
  if (filters.maxAnnualFee !== undefined) params.set("maxAnnualFee", String(filters.maxAnnualFee));
  if (filters.search !== undefined && filters.search.length > 0)
    params.set("search", filters.search);
  const qs = params.toString();
  const response = await fetch(apiUrl(`/cards/catalog${qs ? `?${qs}` : ""}`));
  if (!response.ok) throw new Error("Failed to fetch card catalog");
  return response.json() as Promise<CardCatalogResponse>;
};

export const fetchCardDetail = async (
  id: string,
): Promise<Result<PublicCardDetail, SolverError>> => {
  try {
    const response = await fetch(apiUrl(`/cards/${encodeURIComponent(id)}`));
    if (response.status === 404) {
      return fail({ code: "CARD_NOT_FOUND", message: "Cartão não encontrado." });
    }
    if (!response.ok) {
      return fail({ code: "NETWORK_ERROR", message: "Não foi possível carregar o cartão." });
    }
    const data = (await response.json()) as PublicCardDetail;
    return ok(data);
  } catch {
    return fail({ code: "NETWORK_ERROR", message: "Não foi possível conectar à API." });
  }
};
