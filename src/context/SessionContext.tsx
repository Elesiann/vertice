import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
} from "react";
import { z } from "zod";
import type { SpendingProfile } from "@/types";

interface SessionContextValue {
  profile: SpendingProfile | null;
  setProfile: Dispatch<SetStateAction<SpendingProfile | null>>;
  ptaxOverride: number | null;
  setPtaxOverride: Dispatch<SetStateAction<number | null>>;
  profileSavedAt: string | null;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "stackr.profile.v1";

// Schema permissivo: estrutura coerente é o que importa. Enums abertos
// (`program`) usam z.string() pra não invalidar storage existente quando
// o catálogo cresce.
const StoredProfileSchema = z.object({
  profile: z.object({
    monthlyDomesticBrl: z.number().min(0),
    monthlyInternationalUsd: z.number().min(0),
    monthlyIncomeBrl: z.number().min(0).optional(),
    availableToInvestBrl: z.number().min(0).optional(),
    redemption: z.union([
      z.object({ kind: z.literal("miles"), program: z.string() }),
      z.object({ kind: z.literal("cashback") }),
      z.object({ kind: z.literal("any") }),
    ]),
    currentCardIds: z.array(z.string()).optional(),
    tripsPerYear: z.number().int().min(0).optional(),
  }),
  savedAt: z.string(),
});

interface StoredProfileEntry {
  profile: SpendingProfile;
  savedAt: string;
}

const readStorage = (): StoredProfileEntry | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = StoredProfileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data as StoredProfileEntry;
  } catch {
    return null;
  }
};

const writeStorage = (profile: SpendingProfile): string => {
  const savedAt = new Date().toISOString();
  if (typeof window === "undefined") return savedAt;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, savedAt }));
  } catch {
    // storage indisponível (quota, modo privado): falha silenciosa.
  }
  return savedAt;
};

const clearStorage = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem.
  }
};

interface ProfileState {
  profile: SpendingProfile | null;
  savedAt: string | null;
}

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps): JSX.Element => {
  const [profileState, setProfileStateInternal] = useState<ProfileState>(() => {
    const stored = readStorage();
    return stored !== null
      ? { profile: stored.profile, savedAt: stored.savedAt }
      : { profile: null, savedAt: null };
  });
  const [ptaxOverride, setPtaxOverride] = useState<number | null>(null);

  const setProfile = useCallback<Dispatch<SetStateAction<SpendingProfile | null>>>((next) => {
    setProfileStateInternal((prev) => {
      const resolved = typeof next === "function" ? next(prev.profile) : next;
      if (resolved === null) {
        clearStorage();
        return { profile: null, savedAt: null };
      }
      const savedAt = writeStorage(resolved);
      return { profile: resolved, savedAt };
    });
  }, []);

  const reset = useCallback(() => {
    clearStorage();
    setProfileStateInternal({ profile: null, savedAt: null });
    setPtaxOverride(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      profile: profileState.profile,
      setProfile,
      profileSavedAt: profileState.savedAt,
      ptaxOverride,
      setPtaxOverride,
      reset,
    }),
    [profileState.profile, profileState.savedAt, setProfile, ptaxOverride, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (ctx === null) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
};
