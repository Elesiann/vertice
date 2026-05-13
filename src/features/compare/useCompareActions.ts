import { useMemo } from "react";
import { useCompareStore } from "@/lib/compare-store";
import { ROUTES } from "@/lib/routes-constants";

const COMPARE_LIMIT = 4;
const MIN_COMPARED_CARDS = 2;

export interface CompareActions {
  ids: string[];
  count: number;
  isFull: boolean;
  compareHref: string;
  hasCard: (id: string) => boolean;
  canRemoveComparedCard: boolean;
  addCard: (id: string) => void;
  removeCard: (id: string) => void;
  removeComparedCard: (id: string) => void;
  toggleCard: (id: string) => void;
  setCards: (ids: string[]) => void;
  addCardReplacing: (id: string, replaceId?: string) => void;
  clear: () => void;
}

const normalizeIds = (ids: string[]): string[] => Array.from(new Set(ids)).slice(0, COMPARE_LIMIT);

export const compareHrefForIds = (ids: string[]): string => {
  const normalized = normalizeIds(ids);
  return normalized.length > 0 ? `${ROUTES.COMPARE}?ids=${normalized.join(",")}` : ROUTES.COMPARE;
};

export const useCompareActions = (): CompareActions => {
  const ids = useCompareStore((state) => state.ids);
  const setIds = useCompareStore((state) => state.setIds);
  const add = useCompareStore((state) => state.add);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  return useMemo(() => {
    const hasCard = (id: string): boolean => ids.includes(id);
    const setCards = (nextIds: string[]): void => {
      setIds(nextIds);
    };
    const addCardReplacing = (id: string, replaceId?: string): void => {
      if (ids.includes(id)) return;
      const fallbackReplaceId = ids.at(-1);
      const idToReplace = replaceId ?? fallbackReplaceId;
      const baseIds =
        ids.length >= COMPARE_LIMIT && idToReplace !== undefined
          ? ids.filter((cardId) => cardId !== idToReplace)
          : ids;
      setIds([...baseIds, id]);
    };

    return {
      ids,
      count: ids.length,
      isFull: ids.length >= COMPARE_LIMIT,
      compareHref: compareHrefForIds(ids),
      hasCard,
      canRemoveComparedCard: ids.length > MIN_COMPARED_CARDS,
      addCard: add,
      removeCard: remove,
      removeComparedCard: (id: string) => {
        if (ids.length <= MIN_COMPARED_CARDS) return;
        remove(id);
      },
      toggleCard: (id: string) => {
        if (ids.includes(id)) {
          remove(id);
          return;
        }
        add(id);
      },
      setCards,
      addCardReplacing,
      clear,
    };
  }, [add, clear, ids, remove, setIds]);
};
