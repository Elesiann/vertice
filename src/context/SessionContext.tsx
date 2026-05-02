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

interface SessionContextValue {
  ptaxOverride: number | null;
  setPtaxOverride: Dispatch<SetStateAction<number | null>>;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps): JSX.Element => {
  const [ptaxOverride, setPtaxOverride] = useState<number | null>(null);

  const reset = useCallback(() => {
    setPtaxOverride(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ptaxOverride, setPtaxOverride, reset }),
    [ptaxOverride, reset],
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
