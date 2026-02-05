import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLogStore } from '../stores/logStore';
import { WaterfallTimeline } from './WaterfallTimeline';
import { BurgerMenu } from './BurgerMenu';
import { TimeRangeSelector } from './TimeRangeSelector';
import { getWaterfallPosition, getWaterfallBarWidth, calculateTimelineWidth } from '../utils/timelineUtils';
import { LogDisplayView } from '../views/LogDisplayView';
import { useScrollSync } from '../hooks/useScrollSync';
import { useUrlRequestAutoScroll } from '../hooks/useUrlRequestAutoScroll';
import type { HttpRequest } from '../types/log.types';

/**
 * Column definition for the RequestTable component.
 */
export interface ColumnDef {
  /** Unique column identifier */
  id: string;
  /** Column header label */
  label: string;
  /** Extract the display value from a request */
  getValue: (req: HttpRequest) => string;
  /** Optional CSS class name for the column */
  className?: string;
}

/**
 * Props for the RequestTable component.
 */
export interface RequestTableProps {
  /** Title displayed in the header */
  title: string;
  /** Column definitions for the sticky left panel */
  columns: ColumnDef[];
  /** CSS class applied to the container for view-specific styling */
  containerClassName?: string;
  /** Filtered requests to display */
  filteredRequests: HttpRequest[];
  /** Total count to display (pre-calculated by the view) */
  totalCount: number;
  /** Whether to hide pending requests */
  hidePending: boolean;
  /** Callback when hide pending checkbox changes */
  onHidePendingChange: (value: boolean) => void;
  /** Optional additional header controls before the checkbox (e.g., connection dropdown) */
  headerSlot?: ReactNode;
  /** Message to show when no requests are found */
  emptyMessage?: string;
  /** CSS selector prefix for row measurement (e.g., '.sync-view' or '') */
  rowSelector?: string;
}

/**
 * Reusable request timeline table component.
 * Displays requests in a two-panel layout: sticky columns on the left, waterfall timeline on the right.
 *
 * Used by HttpRequestsView, SyncView, and other future request-type views.
 */
export function RequestTable({
  title,
  columns,
  containerClassName = '',
  filteredRequests,
  totalCount,
  hidePending,
  onHidePendingChange,
  headerSlot,
  emptyMessage = 'No requests found',
  rowSelector = '',
}: RequestTableProps) {
  const {
    expandedRows,
    openLogViewerIds,
    rawLogLines,
    toggleRowExpansion,
    closeLogViewer,
    setActiveRequest,
  } = useLogStore();

  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);

  // Use shared scroll sync hook
  useScrollSync(leftPanelRef, waterfallContainerRef);

  // Use shared URL auto-scroll hook
  useUrlRequestAutoScroll(filteredRequests, leftPanelRef);

  // Measure actual row column widths and sync to header
  useEffect(() => {
    const selector = rowSelector ? `${rowSelector} .request-row-sticky` : '.request-row-sticky';
    const firstRow = document.querySelector(selector);
    if (!firstRow) return;

    const children = Array.from(firstRow.children) as HTMLElement[];
    const widths = children.map(child => child.getBoundingClientRect().width);

    if (widths.length > 0 && widths.some(w => w > 0)) {
      setColumnWidths(widths);
    }
  }, [filteredRequests, rowSelector]);

  // Calculate timeline scale
  const times = filteredRequests
    .map((r) => {
      const sendLine = rawLogLines.find(l => l.lineNumber === r.sendLineNumber);
      return sendLine?.timestampMs || 0;
    })
    .filter((t) => t > 0);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalDuration = Math.max(1, maxTime - minTime);

  // Calculate timeline width using shared logic
  const visibleTimes = filteredRequests
    .slice(0, 20)
    .map((r) => {
      const sendLine = rawLogLines.find(l => l.lineNumber === r.sendLineNumber);
      return sendLine?.timestampMs || 0;
    })
    .filter((t) => t > 0);

  const { timelineWidth } = calculateTimelineWidth(
    containerWidth,
    visibleTimes,
    minTime,
    maxTime
  );

  // Handle resize for layout measurements
  useEffect(() => {
    const handleResize = () => {
      if (!waterfallContainerRef.current) return;
      setContainerWidth(waterfallContainerRef.current.clientWidth);
    };

    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    if (waterfallContainerRef.current) {
      observer.observe(waterfallContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [timelineWidth]);

  /** Handle click on request ID - toggle expansion or open log viewer */
  const handleRequestClick = useCallback((requestId: string) => {
    // Remove id parameter from URL if clicking a different request
    const hash = window.location.hash;
    const match = hash.match(/id=([^&]+)/);
    if (match) {
      const urlId = decodeURIComponent(match[1]);
      if (urlId !== requestId) {
        const newHash = hash.replace(/[?&]id=[^&]+/, '').replace(/\?&/, '?').replace(/\?$/, '');
        window.location.hash = newHash;
      }
    }

    // If clicking the same request that's already open, close it
    if (openLogViewerIds.has(requestId) && expandedRows.has(requestId)) {
      closeLogViewer(requestId);
      toggleRowExpansion(requestId);
      return;
    }
    // Open clicked request and close all others atomically
    setActiveRequest(requestId);
  }, [openLogViewerIds, expandedRows, closeLogViewer, toggleRowExpansion, setActiveRequest]);

  /** Handle mouse enter on a row - highlight both panels */
  const handleRowMouseEnter = (requestId: string) => {
    const leftRow = document.querySelector(`[data-row-id="sticky-${requestId}"]`);
    const rightRow = document.querySelector(`[data-row-id="waterfall-${requestId}"]`);
    leftRow?.classList.add('row-hovered');
    rightRow?.classList.add('row-hovered');
  };

  /** Handle mouse leave on a row - remove highlight */
  const handleRowMouseLeave = (requestId: string) => {
    const leftRow = document.querySelector(`[data-row-id="sticky-${requestId}"]`);
    const rightRow = document.querySelector(`[data-row-id="waterfall-${requestId}"]`);
    leftRow?.classList.remove('row-hovered');
    rightRow?.classList.remove('row-hovered');
  };

  /** Render the expanded log viewer for a request */
  const renderExpandedLogViewer = () => {
    const expandedRequestId = Array.from(openLogViewerIds).find(id => expandedRows.has(id));
    if (!expandedRequestId) return null;

    const req = filteredRequests.find(r => r.requestId === expandedRequestId);
    if (!req) return null;

    const reqIndex = filteredRequests.findIndex(r => r.requestId === expandedRequestId);
    const prevRequest = reqIndex > 0 ? filteredRequests[reqIndex - 1] : null;
    const nextRequest = reqIndex < filteredRequests.length - 1 ? filteredRequests[reqIndex + 1] : null;

    const prevRequestLineRange = prevRequest ? {
      start: prevRequest.sendLineNumber,
      end: prevRequest.responseLineNumber || prevRequest.sendLineNumber
    } : undefined;

    const nextRequestLineRange = nextRequest ? {
      start: nextRequest.sendLineNumber,
      end: nextRequest.responseLineNumber || nextRequest.sendLineNumber
    } : undefined;

    return (
      <div className="expanded-log-viewer">
        <LogDisplayView
          key={expandedRequestId}
          requestFilter={`"${expandedRequestId}"`}
          defaultShowOnlyMatching
          defaultLineWrap
          logLines={rawLogLines.map(line => ({
            ...line,
            timestamp: line.displayTime
          }))}
          prevRequestLineRange={prevRequestLineRange}
          nextRequestLineRange={nextRequestLineRange}
          onClose={() => {
            closeLogViewer(expandedRequestId);
            if (expandedRows.has(expandedRequestId)) {
              toggleRowExpansion(expandedRequestId);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className={`app ${containerClassName}`.trim()}>
      <div className="header-compact">
        <div className="header-left">
          <BurgerMenu />
          <h1 className="header-title">{title}</h1>
        </div>

        <div className="header-center">
          {headerSlot}

          <label className="checkbox-compact">
            <input
              type="checkbox"
              checked={hidePending}
              onChange={(e) => onHidePendingChange(e.target.checked)}
            />
            Hide pending
          </label>

          <div className="stats-compact">
            <span id="shown-count">{filteredRequests.length}</span> / <span id="total-count">{totalCount}</span>
          </div>
        </div>

        <div className="header-right">
          <TimeRangeSelector />
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-header-sticky" ref={stickyHeaderRef}>
            {columns.map((col, i) => (
              <div
                key={col.id}
                className={`sticky-col ${col.className || ''}`}
                style={columnWidths[i] ? { width: `${columnWidths[i]}px` } : {}}
              >
                {col.label}
              </div>
            ))}
          </div>
          <div className="timeline-header-waterfall">
            <WaterfallTimeline
              minTime={minTime}
              maxTime={maxTime}
              totalDuration={totalDuration}
              width={timelineWidth}
              cursorContainerRef={waterfallContainerRef}
              cursorOffsetLeft={0}
            />
          </div>
        </div>

        <div className="scroll-content">
          <div id="timeline-content">
            {filteredRequests.length === 0 ? (
              <div className="no-data">{emptyMessage}</div>
            ) : (
              <div className="timeline-content-wrapper">
                {/* Left panel - sticky columns */}
                <div className="timeline-rows-left" ref={leftPanelRef}>
                  {filteredRequests.map((req) => (
                    <div
                      key={`sticky-${req.requestId}`}
                      data-row-id={`sticky-${req.requestId}`}
                      className={`request-row ${(expandedRows.has(req.requestId) && openLogViewerIds.has(req.requestId)) ? 'expanded' : ''} ${!req.status ? 'pending' : ''}`}
                      style={{ minHeight: '28px' }}
                      onMouseEnter={() => handleRowMouseEnter(req.requestId)}
                      onMouseLeave={() => handleRowMouseLeave(req.requestId)}
                    >
                      <div className="request-row-sticky">
                        {columns.map((col, i) => {
                          // First column is clickable request ID
                          if (i === 0) {
                            return (
                              <div
                                key={col.id}
                                className={`request-id clickable sticky-col ${col.className || ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestClick(req.requestId);
                                }}
                              >
                                {col.getValue(req)}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={col.id}
                              className={`sticky-col ${col.className || ''}`}
                              title={col.getValue(req)}
                            >
                              {col.getValue(req)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right panel - waterfall */}
                <div className="timeline-rows-right" ref={waterfallContainerRef}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: `${timelineWidth}px` }}>
                    {filteredRequests.map((req) => {
                      const sendLine = rawLogLines.find(l => l.lineNumber === req.sendLineNumber);
                      const reqTime = sendLine?.timestampMs || 0;
                      const barLeft = getWaterfallPosition(reqTime, minTime, totalDuration, timelineWidth);
                      const barWidth = getWaterfallBarWidth(
                        req.requestDurationMs,
                        totalDuration,
                        timelineWidth,
                        2
                      );
                      const status = req.status ? req.status : 'Pending';
                      const isPending = !req.status;
                      const statusClass = isPending ? 'pending' : req.status === '200' ? 'success' : 'error';

                      return (
                        <div
                          key={`waterfall-${req.requestId}`}
                          data-row-id={`waterfall-${req.requestId}`}
                          className={`request-row ${(expandedRows.has(req.requestId) && openLogViewerIds.has(req.requestId)) ? 'expanded' : ''} ${isPending ? 'pending' : ''}`}
                          style={{ minHeight: '28px' }}
                          onMouseEnter={() => handleRowMouseEnter(req.requestId)}
                          onMouseLeave={() => handleRowMouseLeave(req.requestId)}
                        >
                          <div style={{ flex: 1, overflow: 'visible', position: 'relative', minWidth: `${timelineWidth}px` }}>
                            <div
                              className="waterfall-item"
                              style={{
                                left: `${barLeft}px`,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <div
                                className={`waterfall-bar ${statusClass}`}
                                style={{
                                  width: `${barWidth}px`,
                                  minWidth: '2px',
                                }}
                                title={statusClass === 'pending' ? 'Pending' : status}
                              />
                              <span className="waterfall-duration" title={statusClass === 'pending' ? 'Pending' : status}>
                                {isPending ? '...' : status === '200' ? `${req.requestDurationMs}ms` : `${status} - ${req.requestDurationMs}ms`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {renderExpandedLogViewer()}
      </div>
    </div>
  );
}
