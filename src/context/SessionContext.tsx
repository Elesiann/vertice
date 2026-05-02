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
import type { UploadFileState } from "@/types";

interface SessionContextValue {
  files: readonly UploadFileState[];
  setFiles: Dispatch<SetStateAction<UploadFileState[]>>;
  ptaxOverride: number | null;
  setPtaxOverride: Dispatch<SetStateAction<number | null>>;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider = ({ children }: SessionProviderProps): JSX.Element => {
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [ptaxOverride, setPtaxOverride] = useState<number | null>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setPtaxOverride(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ files, setFiles, ptaxOverride, setPtaxOverride, reset }),
    [files, ptaxOverride, reset],
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
