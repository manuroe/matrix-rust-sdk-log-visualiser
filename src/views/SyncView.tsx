import { useLogStore } from '../stores/logStore';
import { timeToMs, applyTimeRangeFilter } from '../utils/timeUtils';
import { isoToTime } from '../utils/timeUtils';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { WaterfallTimeline } from '../components/WaterfallTimeline';
import { getWaterfallPosition, getWaterfallBarWidth } from '../utils/timelineUtils';
import { calculateTimelineWidth } from '../utils/timelineUtils';
import { LogDisplayView } from './LogDisplayView';
import { useState, useRef, useEffect } from 'react';

export function SyncView() {
  const {
    allRequests,
    filteredRequests,
    connectionIds,
    selectedConnId,
    hidePending,
    startTime,
    endTime,
    expandedRows,
    openLogViewerIds,
    rawLogLines,
    setSelectedConnId,
    setHidePending,
    toggleRowExpansion,
    openLogViewer,
    closeLogViewer,
    setActiveRequest,
  } = useLogStore();

  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [stickyColumnsWidth, setStickyColumnsWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const syncingRef = useRef(false);
  const scrolledIdRef = useRef<string | null>(null);  // Track which ID we've scrolled to

  // Measure actual row column widths and sync to header
  useEffect(() => {
    const firstRow = document.querySelector('.sync-view .request-row-sticky');
    if (!firstRow) return;

    const children = Array.from(firstRow.children) as HTMLElement[];
    const widths = children.map(child => child.getBoundingClientRect().width);
    
    if (widths.length > 0 && widths.some(w => w > 0)) {
      setColumnWidths(widths);
    }
  }, [filteredRequests]);

  // Sync vertical scroll between left and right panels
  useEffect(() => {
    const rightPanel = waterfallContainerRef.current;
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
  }, []);

  // Calculate total for selected connection, considering time range filter
  const connFilteredRequests = allRequests.filter(
    (r) => !selectedConnId || r.connId === selectedConnId
  );
  const totalForConn = applyTimeRangeFilter(connFilteredRequests, startTime, endTime).length;

  // Calculate timeline scale
  const times = filteredRequests
    .map((r) => r.requestTime)
    .filter((t) => t)
    .map(timeToMs);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalDuration = Math.max(1, maxTime - minTime);

  const columnGaps = 8 * 4;
  const horizontalPadding = 16 * 2;
  const availableWaterfallWidth = Math.max(
    300,
    containerWidth - stickyColumnsWidth - columnGaps - horizontalPadding
  );

  // Calculate timeline width using shared logic
  const visibleTimes = filteredRequests
    .slice(0, 20)
    .map((r) => r.requestTime)
    .filter((t) => t)
    .map(timeToMs);
  
  const { timelineWidth } = calculateTimelineWidth(
    availableWaterfallWidth,
    visibleTimes,
    minTime,
    maxTime
  );

  // Measure sticky columns width from DOM
  useEffect(() => {
    if (!timelineHeaderRef.current) return;
    
    const stickyCols = Array.from(timelineHeaderRef.current.querySelectorAll('.sticky-col'));
    const lastStickyCol = stickyCols[stickyCols.length - 1];
    if (lastStickyCol) {
      const rect = lastStickyCol.getBoundingClientRect();
      const headerRect = timelineHeaderRef.current.getBoundingClientRect();
      const width = rect.right - headerRect.left;
      setStickyColumnsWidth(width);
    }
  }, []);

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

    const container = waterfallContainerRef.current;
    if (container) {
      return () => {
        observer.disconnect();
      };
    }
  }, [timelineWidth]);

  // Open log viewer and scroll to request when id parameter is provided
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
          
          setTimeout(checkAndScroll, 1000);
        }
      }
    }
  }, [filteredRequests, openLogViewerIds, expandedRows, openLogViewer, toggleRowExpansion]);

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

  return (
    <div className="app sync-view">
      <div className="header-compact">
        <div className="header-left">
          <BurgerMenu />
          <h1 className="header-title">
            /sync requests
          </h1>
        </div>
        
        <div className="header-center">
          <select
            id="conn-filter"
            value={selectedConnId}
            onChange={(e) => setSelectedConnId(e.target.value)}
            className="select-compact"
          >
            {connectionIds.map((connId) => (
              <option key={connId} value={connId}>
                {connId}
              </option>
            ))}
          </select>
          
          <label className="checkbox-compact">
            <input
              type="checkbox"
              id="hide-pending"
              checked={hidePending}
              onChange={(e) => setHidePending(e.target.checked)}
            />
            Hide pending
          </label>
          
          <div className="stats-compact">
            <span id="shown-count">{filteredRequests.length}</span> / <span id="total-count">{totalForConn}</span>
          </div>
        </div>
        
        <div className="header-right">
          <TimeRangeSelector />
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-header-sticky">
            <div className="sticky-col" style={columnWidths[0] ? { width: `${columnWidths[0]}px` } : {}}>Request</div>
            <div className="sticky-col" style={columnWidths[1] ? { width: `${columnWidths[1]}px` } : {}}>Time</div>
            <div className="sticky-col" style={columnWidths[2] ? { width: `${columnWidths[2]}px` } : {}}>↑ Size</div>
            <div className="sticky-col" style={columnWidths[3] ? { width: `${columnWidths[3]}px` } : {}}>↓ Size</div>
          </div>
          <div className="timeline-header-waterfall" ref={timelineHeaderRef}>
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
              <div className="no-data">No sync requests found in log file</div>
            ) : (
              <div className="timeline-content-wrapper">
                <div className="timeline-rows-left" ref={leftPanelRef}>
                  {filteredRequests.map((req) => (
                    <div
                      key={`sticky-${req.requestId}`}
                      data-row-id={`sticky-${req.requestId}`}
                      className={`request-row ${(expandedRows.has(req.requestId) && openLogViewerIds.has(req.requestId)) ? 'expanded' : ''} ${!req.status ? 'pending' : ''}`}
                      style={{ minHeight: '28px' }}
                      onMouseEnter={() => {
                        const leftRow = document.querySelector(`[data-row-id="sticky-${req.requestId}"]`);
                        const rightRow = document.querySelector(`[data-row-id="waterfall-${req.requestId}"]`);
                        leftRow?.classList.add('row-hovered');
                        rightRow?.classList.add('row-hovered');
                      }}
                      onMouseLeave={() => {
                        const leftRow = document.querySelector(`[data-row-id="sticky-${req.requestId}"]`);
                        const rightRow = document.querySelector(`[data-row-id="waterfall-${req.requestId}"]`);
                        leftRow?.classList.remove('row-hovered');
                        rightRow?.classList.remove('row-hovered');
                      }}
                    >
                      <div className="request-row-sticky">
                        <div
                          className="request-id clickable sticky-col"
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            // Remove id parameter from URL if clicking a different request
                            const hash = window.location.hash;
                            const match = hash.match(/id=([^&]+)/);
                            if (match) {
                              const urlId = decodeURIComponent(match[1]);
                              if (urlId !== req.requestId) {
                                // Remove the id parameter
                                const newHash = hash.replace(/[?&]id=[^&]+/, '').replace(/\?&/, '?').replace(/\?$/, '');
                                window.location.hash = newHash;
                              }
                            }
                            
                            // If clicking the same request that's already open, close it
                            if (openLogViewerIds.has(req.requestId) && expandedRows.has(req.requestId)) {
                              closeLogViewer(req.requestId);
                              toggleRowExpansion(req.requestId);
                              return;
                            }
                            // Open clicked request and close all others atomically
                            setActiveRequest(req.requestId);
                          }}
                        >
                          {req.requestId}
                        </div>
                        <div className="time sticky-col">{isoToTime(req.requestTime)}</div>
                        <div className="size sticky-col">{req.requestSize || '-'}</div>
                        <div className="size sticky-col">{req.responseSize || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="timeline-rows-right" ref={waterfallContainerRef}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: `${timelineWidth}px` }}>
                    {filteredRequests.map((req) => {
                      const reqTime = timeToMs(req.requestTime);
                      const barLeft = getWaterfallPosition(reqTime, minTime, totalDuration, timelineWidth);
                      const barWidth = getWaterfallBarWidth(
                        parseFloat(String(req.requestDurationMs || 0)),
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
                          onMouseEnter={() => {
                            const leftRow = document.querySelector(`[data-row-id="sticky-${req.requestId}"]`);
                            const rightRow = document.querySelector(`[data-row-id="waterfall-${req.requestId}"]`);
                            leftRow?.classList.add('row-hovered');
                            rightRow?.classList.add('row-hovered');
                          }}
                          onMouseLeave={() => {
                            const leftRow = document.querySelector(`[data-row-id="sticky-${req.requestId}"]`);
                            const rightRow = document.querySelector(`[data-row-id="waterfall-${req.requestId}"]`);
                            leftRow?.classList.remove('row-hovered');
                            rightRow?.classList.remove('row-hovered');
                          }}
                        >
                          <div style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
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
                              >
                              </div>
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

        {/* Expanded log viewer - full width */}
        {(() => {
          const expandedRequestId = Array.from(openLogViewerIds).find(id => expandedRows.has(id));
          if (!expandedRequestId) return null;

          const req = filteredRequests.find(r => r.requestId === expandedRequestId);
          if (!req) return null;

          const reqIndex = filteredRequests.findIndex(r => r.requestId === expandedRequestId);
          const prevRequest = reqIndex > 0 ? filteredRequests[reqIndex - 1] : null;
          const nextRequest = reqIndex < filteredRequests.length - 1 ? filteredRequests[reqIndex + 1] : null;
          
          const findLineNumber = (logText: string): number => {
            if (!logText) return -1;
            return rawLogLines.findIndex(l => l.rawText === logText);
          };
          
          const prevRequestLineRange = prevRequest ? {
            start: findLineNumber(prevRequest.sendLine),
            end: findLineNumber(prevRequest.responseLine) || findLineNumber(prevRequest.sendLine)
          } : undefined;
          
          const nextRequestLineRange = nextRequest ? {
            start: findLineNumber(nextRequest.sendLine),
            end: findLineNumber(nextRequest.responseLine) || findLineNumber(nextRequest.sendLine)
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
                  timestamp: isoToTime(line.timestamp)
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
        })()}      </div>
    </div>
  );
}