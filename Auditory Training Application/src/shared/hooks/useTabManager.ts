import { useTabStore } from '@/shared/store/tabStore';
import type { TabConfig } from '@/shared/types/tabs';

export function useTabManager() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const openOrActivate = useTabStore((s) => s.openOrActivate);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActive = useTabStore((s) => s.setActive);

  return { tabs, activeTabId, openOrActivate, closeTab, setActive };
}

export type { TabConfig };