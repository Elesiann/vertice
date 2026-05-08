import { create } from "zustand";

interface CompareStore {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  ids: [],
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
