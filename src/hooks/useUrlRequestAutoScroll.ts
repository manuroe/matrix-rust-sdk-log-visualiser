import { useEffect, useRef } from 'react';
import { useLogStore } from '../stores/logStore';
import type { HttpRequest } from '../types/log.types';

/**
 * Hook to handle URL hash `id=` parameter for auto-opening and scrolling to a request.
 * Opens the log viewer for the specified request ID and scrolls the panel to center it.
 *
 * @param filteredRequests - The list of filtered requests to search within
 * @param leftPanelRef - Ref to the scrollable left panel for auto-scroll
 */
export function useUrlRequestAutoScroll(
  filteredRequests: HttpRequest[],
  leftPanelRef: React.RefObject<HTMLDivElement | null>
): void {
  const {
    expandedRows,
    openLogViewerIds,
    openLogViewer,
    toggleRowExpansion,
  } = useLogStore();

  const scrolledIdRef = useRef<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/id=([^&]+)/);
    if (match) {
      const reqId = decodeURIComponent(match[1]);
      const requestExists = filteredRequests.some(r => r.requestId === reqId);

      if (requestExists) {
        if (!openLogViewerIds.has(reqId)) {
          openLogViewer(reqId);
        }
        if (!expandedRows.has(reqId)) {
          toggleRowExpansion(reqId);
        }

        if (scrolledIdRef.current !== reqId) {
          scrolledIdRef.current = reqId;
          const requestIndex = filteredRequests.findIndex(r => r.requestId === reqId);

          if (requestIndex === -1) return;

          const checkAndScroll = () => {
            const leftPanel = leftPanelRef.current;

            if (!leftPanel) {
              setTimeout(checkAndScroll, 100);
              return;
            }

            const measuredRow = leftPanel.querySelector('.request-row') as HTMLElement | null;
            const rowHeight = measuredRow?.offsetHeight ?? 28;
            const panelHeight = leftPanel.clientHeight;
            const maxScroll = Math.max(0, leftPanel.scrollHeight - panelHeight);
            const rowLogicalTop = requestIndex * rowHeight;
            const scrollTarget = rowLogicalTop - (panelHeight / 2) + (rowHeight / 2);
            const clampedTarget = Math.max(0, Math.min(scrollTarget, maxScroll));

            const attemptScroll = (attempt: number) => {
              leftPanel.scrollTo({ top: clampedTarget, behavior: 'auto' });
              const delta = Math.abs(leftPanel.scrollTop - clampedTarget);

              if (delta > 4 && attempt < 6) {
                setTimeout(() => attemptScroll(attempt + 1), 120);
              }
            };

            attemptScroll(0);
          };

          // Wait for virtual scrolling to settle
          setTimeout(checkAndScroll, 1000);
        }
      }
    }
  }, [filteredRequests, openLogViewerIds, expandedRows, openLogViewer, toggleRowExpansion, leftPanelRef]);

  // Clear expanded state on unmount (unless there's an id parameter to preserve)
  useEffect(() => {
    return () => {
      const hash = window.location.hash;
      const match = hash.match(/id=([^&]+)/);
      if (!match) {
        // Clear all at once without iteration to prevent infinite loops
        useLogStore.setState({ expandedRows: new Set(), openLogViewerIds: new Set() });
      }
    };
  }, []);
}
