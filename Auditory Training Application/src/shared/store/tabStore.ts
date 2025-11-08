import { create } from 'zustand';
import type { TabConfig } from '@/shared/types/tabs';

interface TabState {
  tabs: TabConfig[];
  activeTabId: string | null;
  openOrActivate: (tab: TabConfig) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  openOrActivate: (tab) => {
    const { tabs } = get();
    const exists = tabs.find((t) => t.id === tab.id);
    if (exists) {
      set({ activeTabId: tab.id });
      return;
    }
    const closable = tab.closable ?? true;
    const newTabs = [...tabs, { ...tab, closable }];
    set({ tabs: newTabs, activeTabId: tab.id });
  },
  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const target = tabs.find((t) => t.id === id);
    if (target && target.closable === false) return;

    const filtered = tabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const neighbor = filtered[idx] ?? filtered[idx - 1] ?? null;
      nextActive = neighbor ? neighbor.id : null;
    }
    set({ tabs: filtered, activeTabId: nextActive });
  },
  setActive: (id) => set({ activeTabId: id }),
}));