import { useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { aggregate } from "@/lib/aggregator";
import type { SpendingAggregate, Transaction } from "@/types";

interface ParsedSession {
  transactions: readonly Transaction[];
  aggregate: SpendingAggregate;
}

export const useParsedSession = (): ParsedSession => {
  const { files, ptaxOverride } = useSession();

  const transactions = useMemo<readonly Transaction[]>(() => {
    const all: Transaction[] = [];
    for (const file of files) {
      if (file.status.kind === "success") {
        all.push(...file.status.result.transactions);
      }
    }
    return all;
  }, [files]);

  const aggregateResult = useMemo(() => {
    if (ptaxOverride === null) return aggregate(transactions);
    return aggregate(transactions, { ptaxRate: ptaxOverride });
  }, [transactions, ptaxOverride]);

  return { transactions, aggregate: aggregateResult };
};
