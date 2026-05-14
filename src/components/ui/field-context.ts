import { createContext, useContext } from "react";

export interface FieldContextValue {
  id: string;
  invalid: boolean;
  required?: boolean;
  describedBy?: string;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export const useFieldContext = (): FieldContextValue | null => useContext(FieldContext);
