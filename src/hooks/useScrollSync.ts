import { useEffect, useRef } from 'react';

/**
 * Hook to synchronize vertical scroll between two panel refs.
 * Used for keeping left (sticky columns) and right (waterfall) panels in sync.
 *
 * @param leftPanelRef - Ref to the left scrollable panel
 * @param rightPanelRef - Ref to the right scrollable panel
 */
export function useScrollSync(
  leftPanelRef: React.RefObject<HTMLDivElement | null>,
  rightPanelRef: React.RefObject<HTMLDivElement | null>
): void {
  const syncingRef = useRef(false);

  useEffect(() => {
    const rightPanel = rightPanelRef.current;
    const leftPanel = leftPanelRef.current;
    if (!rightPanel || !leftPanel) return;

    const handleLeftScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      rightPanel.scrollTop = leftPanel.scrollTop;
      syncingRef.current = false;
    };

    const handleRightScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      leftPanel.scrollTop = rightPanel.scrollTop;
      syncingRef.current = false;
    };

    leftPanel.addEventListener('scroll', handleLeftScroll);
    rightPanel.addEventListener('scroll', handleRightScroll);

    return () => {
      leftPanel.removeEventListener('scroll', handleLeftScroll);
      rightPanel.removeEventListener('scroll', handleRightScroll);
    };
  }, [leftPanelRef, rightPanelRef]);
}
