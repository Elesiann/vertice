import type { Dispatch, SetStateAction } from "react";
import { useSession } from "@/context/SessionContext";
import { getPtaxRate } from "@/lib/ptax";

interface PtaxRateState {
  rate: number;
  override: number | null;
  setOverride: Dispatch<SetStateAction<number | null>>;
}

export const usePtaxRate = (): PtaxRateState => {
  const { ptaxOverride, setPtaxOverride } = useSession();
  return {
    rate: ptaxOverride === null ? getPtaxRate() : getPtaxRate(ptaxOverride),
    override: ptaxOverride,
    setOverride: setPtaxOverride,
  };
};
