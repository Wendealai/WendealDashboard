import { useCallback, useEffect, useRef } from 'react';

interface SparkeryTabPrefetchConfig {
  activeTab: string;
  tabOrder: readonly string[];
  preloaders: Record<string, () => Promise<unknown>>;
}

export const useSparkeryTabPrefetch = ({
  activeTab,
  tabOrder,
  preloaders,
}: SparkeryTabPrefetchConfig): ((tabKey: string) => void) => {
  const preloadedTabsRef = useRef<Set<string>>(new Set());

  const prefetchTab = useCallback(
    (tabKey: string) => {
      const loader = preloaders[tabKey];
      if (!loader || preloadedTabsRef.current.has(tabKey)) {
        return;
      }

      preloadedTabsRef.current.add(tabKey);
      void loader().catch(() => {
        preloadedTabsRef.current.delete(tabKey);
      });
    },
    [preloaders]
  );

  useEffect(() => {
    const currentIndex = tabOrder.findIndex(key => key === activeTab);
    if (currentIndex === -1) {
      return;
    }

    const nearbyKeys = [
      tabOrder[currentIndex + 1],
      tabOrder[currentIndex - 1],
    ].filter((item): item is string => typeof item === 'string');

    nearbyKeys.forEach(prefetchTab);
  }, [activeTab, prefetchTab, tabOrder]);

  return prefetchTab;
};
