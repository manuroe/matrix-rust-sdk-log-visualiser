import { useLogStore } from '../stores/logStore';
import { timeToMs, applyTimeRangeFilter, isoToTime } from '../utils/timeUtils';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { useEffect, useState, useRef } from 'react';
import { WaterfallTimeline, getWaterfallPosition, getWaterfallBarWidth } from '../components/WaterfallTimeline';
import { calculateTimelineWidth } from '../utils/timelineUtils';
import { LogDisplayView } from './LogDisplayView';

export function HttpRequestsView() {
  const {
    allHttpRequests,
    filteredHttpRequests,
    hidePendingHttp,
    startTime,
    endTime,
    expandedRows,
    openLogViewerIds,
    rawLogLines,
    setHidePendingHttp,
    toggleRowExpansion,
    openLogViewer,
    closeLogViewer,
    setActiveRequest,
  } = useLogStore();

  const waterfallContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const syncingRef = useRef(false);
  const scrolledIdRef = useRef<string | null>(null);  // Track which ID we've scrolled to

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

  // Measure actual row column widths and sync to header
  useEffect(() => {
    const firstRow = document.querySelector('.request-row-sticky');
    if (!firstRow) return;

    const children = Array.from(firstRow.children) as HTMLElement[];
    const widths = children.map(child => child.getBoundingClientRect().width);
    
    if (widths.length > 0 && widths.some(w => w > 0)) {
      setColumnWidths(widths);
    }
  }, [filteredHttpRequests]);

  // Calculate total considering time range filter
  const totalCount = applyTimeRangeFilter(allHttpRequests, startTime, endTime).length;

  // Calculate timeline scale
  const times = filteredHttpRequests
    .map((r) => r.request_time)
    .filter((t) => t)
    .map(timeToMs);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalDuration = Math.max(1, maxTime - minTime);

  // Calculate timeline width using shared logic
  const visibleTimes = filteredHttpRequests
    .slice(0, 20)
    .map((r) => r.request_time)
    .filter((t) => t)
    .map(timeToMs);
  
  const { timelineWidth } = calculateTimelineWidth(
    containerWidth,
    visibleTimes,
    minTime,
    maxTime
  );

  // Find common URI prefix to strip from display
  const commonUriPrefix = findCommonUriPrefix(filteredHttpRequests.map(r => r.uri));

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

  useEffect(() => {
    // Clear expanded state on unmount (unless navigating with id parameter)
    return () => {
      const hash = window.location.hash;
      const match = hash.match(/id=([^&]+)/);
      if (!match) {
        // Clear all at once without iteration to prevent infinite loops
        useLogStore.setState({ expandedRows: new Set(), openLogViewerIds: new Set() });
      }
    };
  }, []);

  useEffect(() => {
    // Check for id param in hash
    const hash = window.location.hash;
    const match = hash.match(/id=([^&]+)/);
    if (match) {
      const reqId = decodeURIComponent(match[1]);
      // Check if request exists in filtered list
      const requestExists = filteredHttpRequests.some(r => r.request_id === reqId);
      
      if (requestExists) {
        // Open the log viewer and expand row
        if (!openLogViewerIds.has(reqId)) {
          openLogViewer(reqId);
        }
        if (!expandedRows.has(reqId)) {
          toggleRowExpansion(reqId);
        }
        
        // Scroll only if we haven't scrolled to this ID yet
        if (scrolledIdRef.current !== reqId) {
          scrolledIdRef.current = reqId;
          
          // Find the index of this request in the filtered list
          const requestIndex = filteredHttpRequests.findIndex(r => r.request_id === reqId);
          
          if (requestIndex === -1) {
            return;
          }
          
          // Wait for DOM to fully settle before measuring and scrolling
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

            // Position: scroll to the row, then center it
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
          
          // Wait longer for virtual scrolling to settle
          setTimeout(checkAndScroll, 1000);
        }
      }
    }
  }, [filteredHttpRequests, openLogViewerIds, expandedRows, openLogViewer, toggleRowExpansion]);

  return (
    <div className="app">
      <div className="header-compact">
        <div className="header-left">
          <BurgerMenu />
          <h1 className="header-title">
            HTTP Requests
          </h1>
        </div>
        
        <div className="header-center">
          <label className="checkbox-compact">
            <input
              type="checkbox"
              id="hide-pending-http"
              checked={hidePendingHttp}
              onChange={(e) => setHidePendingHttp(e.target.checked)}
            />
            Hide pending
          </label>
          
          <div className="stats-compact">
            <span id="shown-count">{filteredHttpRequests.length}</span> / <span id="total-count">{totalCount}</span>
          </div>
        </div>
        
        <div className="header-right">
          <TimeRangeSelector />
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-header-sticky" ref={stickyHeaderRef}>
            <div className="sticky-col" style={columnWidths[0] ? { width: `${columnWidths[0]}px` } : {}}>Request</div>
            <div className="sticky-col" style={columnWidths[1] ? { width: `${columnWidths[1]}px` } : {}}>URI</div>
            <div className="sticky-col" style={columnWidths[2] ? { width: `${columnWidths[2]}px` } : {}}>Time</div>
            <div className="sticky-col" style={columnWidths[3] ? { width: `${columnWidths[3]}px` } : {}}>Method</div>
            <div className="sticky-col" style={columnWidths[4] ? { width: `${columnWidths[4]}px` } : {}}>↑ Size</div>
            <div className="sticky-col" style={columnWidths[5] ? { width: `${columnWidths[5]}px` } : {}}>↓ Size</div>
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
            {filteredHttpRequests.length === 0 ? (
              <div className="no-data">No HTTP requests found in log file</div>
            ) : (
              <div className="timeline-content-wrapper">
                <div className="timeline-rows-left" ref={leftPanelRef}>
                  {filteredHttpRequests.map((req) => (
                    <div
                      key={`sticky-${req.request_id}`}
                      data-row-id={`sticky-${req.request_id}`}
                      className={`request-row ${(expandedRows.has(req.request_id) && openLogViewerIds.has(req.request_id)) ? 'expanded' : ''} ${!req.status ? 'pending' : ''}`}
                      style={{ minHeight: '28px' }}
                      onMouseEnter={() => {
                        const leftRow = document.querySelector(`[data-row-id="sticky-${req.request_id}"]`);
                        const rightRow = document.querySelector(`[data-row-id="waterfall-${req.request_id}"]`);
                        leftRow?.classList.add('row-hovered');
                        rightRow?.classList.add('row-hovered');
                      }}
                      onMouseLeave={() => {
                        const leftRow = document.querySelector(`[data-row-id="sticky-${req.request_id}"]`);
                        const rightRow = document.querySelector(`[data-row-id="waterfall-${req.request_id}"]`);
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
                              if (urlId !== req.request_id) {
                                // Remove the id parameter
                                const newHash = hash.replace(/[?&]id=[^&]+/, '').replace(/\?&/, '?').replace(/\?$/, '');
                                window.location.hash = newHash;
                              }
                            }
                            
                            // If clicking the same request that's already open, close it
                            if (openLogViewerIds.has(req.request_id) && expandedRows.has(req.request_id)) {
                              closeLogViewer(req.request_id);
                              toggleRowExpansion(req.request_id);
                              return;
                            }
                            // Open clicked request and close all others atomically
                            setActiveRequest(req.request_id);
                          }}
                        >
                          {req.request_id}
                        </div>
                        <div className="uri sticky-col" title={req.uri}>{stripCommonPrefix(extractRelativeUri(req.uri), commonUriPrefix)}</div>
                        <div className="time sticky-col">{isoToTime(req.request_time)}</div>
                        <div className="method">{req.method}</div>
                        <div className="size sticky-col">{req.request_size || '-'}</div>
                        <div className="size sticky-col">{req.response_size || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="timeline-rows-right" ref={waterfallContainerRef}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: `${timelineWidth}px` }}>
                    {filteredHttpRequests.map((req) => {
                      const reqTime = timeToMs(req.request_time);
                      const barLeft = getWaterfallPosition(reqTime, minTime, totalDuration, timelineWidth);
                      const barWidth = getWaterfallBarWidth(
                        parseFloat(String(req.request_duration_ms || 0)),
                        totalDuration,
                        timelineWidth,
                        2
                      );
                      const status = req.status ? req.status : 'Pending';
                      const isPending = !req.status;
                      const statusClass = isPending ? 'pending' : req.status === '200' ? 'success' : 'error';

                      return (
                        <div
                          key={`waterfall-${req.request_id}`}
                          data-row-id={`waterfall-${req.request_id}`}
                          className={`request-row ${(expandedRows.has(req.request_id) && openLogViewerIds.has(req.request_id)) ? 'expanded' : ''} ${isPending ? 'pending' : ''}`}
                          style={{ minHeight: '28px' }}
                          onMouseEnter={() => {
                            const leftRow = document.querySelector(`[data-row-id="sticky-${req.request_id}"]`);
                            const rightRow = document.querySelector(`[data-row-id="waterfall-${req.request_id}"]`);
                            leftRow?.classList.add('row-hovered');
                            rightRow?.classList.add('row-hovered');
                          }}
                          onMouseLeave={() => {
                            const leftRow = document.querySelector(`[data-row-id="sticky-${req.request_id}"]`);
                            const rightRow = document.querySelector(`[data-row-id="waterfall-${req.request_id}"]`);
                            leftRow?.classList.remove('row-hovered');
                            rightRow?.classList.remove('row-hovered');
                          }}
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
                                {isPending ? '...' : status === '200' ? `${req.request_duration_ms}ms` : `${status} - ${req.request_duration_ms}ms`}
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

          const req = filteredHttpRequests.find(r => r.request_id === expandedRequestId);
          if (!req) return null;

          const reqIndex = filteredHttpRequests.findIndex(r => r.request_id === expandedRequestId);
          const prevRequest = reqIndex > 0 ? filteredHttpRequests[reqIndex - 1] : null;
          const nextRequest = reqIndex < filteredHttpRequests.length - 1 ? filteredHttpRequests[reqIndex + 1] : null;
          
          const findLineNumber = (logText: string): number => {
            if (!logText) return -1;
            return rawLogLines.findIndex(l => l.rawText === logText);
          };
          
          const prevRequestLineRange = prevRequest ? {
            start: findLineNumber(prevRequest.send_line),
            end: findLineNumber(prevRequest.response_line) || findLineNumber(prevRequest.send_line)
          } : undefined;
          
          const nextRequestLineRange = nextRequest ? {
            start: findLineNumber(nextRequest.send_line),
            end: findLineNumber(nextRequest.response_line) || findLineNumber(nextRequest.send_line)
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
        })()}
      </div>
    </div>
  );
}

function extractRelativeUri(uri: string): string {
  try {
    // Extract path from full URL (e.g., https://example.com/path -> /path)
    const url = new URL(uri);
    return url.pathname + url.search + url.hash;
  } catch {
    // If not a valid URL, check if it starts with http:// or https://
    const match = uri.match(/^https?:\/\/[^\/]+(.*)$/);
    return match ? match[1] || '/' : uri;
  }
}

function findCommonUriPrefix(uris: string[]): string {
  if (uris.length === 0) return '';
  
  // Extract relative paths first
  const paths = uris.map(extractRelativeUri);
  
  // Find the shortest path to limit prefix search
  const minLength = Math.min(...paths.map(p => p.length));
  
  let commonPrefix = '';
  for (let i = 0; i < minLength; i++) {
    const char = paths[0][i];
    if (paths.every(path => path[i] === char)) {
      commonPrefix += char;
    } else {
      break;
    }
  }
  
  // Only return prefix up to the last `/` to avoid breaking path segments
  const lastSlash = commonPrefix.lastIndexOf('/');
  return lastSlash > 0 ? commonPrefix.substring(0, lastSlash) : '';
}

function stripCommonPrefix(uri: string, prefix: string): string {
  if (!prefix || !uri.startsWith(prefix)) return uri;
  return uri.substring(prefix.length) || '/';
}
