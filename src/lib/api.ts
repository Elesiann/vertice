import { fail, ok, type Result } from "@/lib/result";
import type { CardOption, Recommendation, SolverError, SpendingProfile } from "@/types";

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
    const response = await fetch(apiUrl("/recommendations"), {
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
