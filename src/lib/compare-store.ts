import { create } from "zustand";

interface CompareStore {
  ids: string[];
  setIds: (ids: string[]) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  ids: [],
  setIds: (ids) => {
    set({ ids: Array.from(new Set(ids)).slice(0, 4) });
  },
  add: (id) => {
    const { ids } = get();
    if (ids.includes(id) || ids.length >= 4) return;
    set({ ids: [...ids, id] });
  },
  remove: (id) => {
    set((s) => ({ ids: s.ids.filter((x) => x !== id) }));
  },
  clear: () => {
    set({ ids: [] });
  },
  has: (id) => get().ids.includes(id),
}));
