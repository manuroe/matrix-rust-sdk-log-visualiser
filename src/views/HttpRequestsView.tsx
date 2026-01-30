import { useLogStore } from '../stores/logStore';
import { timeToMs, applyTimeRangeFilter } from '../utils/timeUtils';
import { LogDisplayView } from './LogDisplayView';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import type { HttpRequest } from '../types/log.types';
import { useEffect } from 'react';
import { isoToTime } from '../utils/timeUtils';

export function HttpRequestsView() {
  const {
    allHttpRequests,
    filteredHttpRequests,
    hidePendingHttp,
    startTime,
    endTime,
    expandedRows,
    openLogViewerIds,
    setHidePendingHttp,
    toggleRowExpansion,
    openLogViewer,
    closeLogViewer,
  } = useLogStore();

  const handleExportCSV = () => {
    exportHttpRequestsToCSV(allHttpRequests);
  };

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

  // Find common URI prefix to strip from display
  const commonUriPrefix = findCommonUriPrefix(filteredHttpRequests.map(r => r.uri));

  useEffect(() => {
    // Check for id param in hash
    const hash = window.location.hash;
    const match = hash.match(/id=([^&]+)/);
    if (match) {
      const reqId = decodeURIComponent(match[1]);
      // Open the log viewer for this request
      openLogViewer(reqId);
      setTimeout(() => {
        const allRows = Array.from(document.querySelectorAll('.request-row .request-id.clickable.sticky-col'));
        const target = allRows.find(el => el.textContent === reqId);
        if (target) {
          // Expand if not already
          if (!target.classList.contains('expanded')) {
            console.log('Clicking to expand target:', target.textContent);
            (target as HTMLElement).click();
          }
          // Scroll the nearest scrollable parent of the expanded row to the top
          setTimeout(() => {
            const expandedRow = target.closest('.request-row.expanded');
            console.log('Target:', target, 'Expanded row:', expandedRow);
            if (expandedRow) {
              // Find nearest scrollable parent
              function getScrollableParent(node: HTMLElement | null): HTMLElement | Window {
                while (node && node !== document.body) {
                  const style = window.getComputedStyle(node);
                  const overflowY = style.overflowY;
                  if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
                    return node;
                  }
                  node = node.parentElement;
                }
                return window;
              }
              const scrollParent = getScrollableParent(expandedRow as HTMLElement);
              const header = document.querySelector('.header-compact');
              const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
              const rowRect = (expandedRow as HTMLElement).getBoundingClientRect();
              if (scrollParent instanceof HTMLElement) {
                const parentRect = scrollParent.getBoundingClientRect();
                const scrollTop = scrollParent.scrollTop + (rowRect.top - parentRect.top) - headerHeight;
                scrollParent.scrollTo({ top: scrollTop, behavior: 'smooth' });
                // ...removed debug log...
              } else {
                (expandedRow as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => {
                  window.scrollBy({ top: -headerHeight, behavior: 'smooth' });
                  // ...removed debug log...
                }, 200);
              }
            } else {
              console.log('No expanded row found for target');
            }
          }, 100);
        } else {
          console.log('No target found for reqId', reqId);
        }
      }, 300);
    }
  }, [filteredHttpRequests, openLogViewer]);

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
          <button onClick={handleExportCSV} className="btn-primary btn-compact">
            Export CSV
          </button>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header" style={{
          gridTemplateColumns: '90px 300px 130px 65px 65px 75px 75px minmax(800px, 20fr)'
        }}>
          <div className="sticky-col" style={{ left: '0' }}>Request</div>
          <div className="sticky-col" style={{ left: '90px' }}>URI</div>
          <div className="sticky-col" style={{ left: '390px' }}>Time</div>
          <div>Method</div>
          <div>Status</div>
          <div>↑ Size</div>
          <div>↓ Size</div>
          <div>Duration</div>
        </div>
        <div id="timeline-content">
          {filteredHttpRequests.length === 0 ? (
            <div className="no-data">No HTTP requests found in log file</div>
          ) : (
            filteredHttpRequests.map((req, reqIndex) => {
              const reqTime = timeToMs(req.request_time);
              const relStart = ((reqTime - minTime) / totalDuration) * 100;
              const relDuration = req.request_duration_ms
                ? Math.min(
                    100,
                    (parseFloat(String(req.request_duration_ms)) / totalDuration) * 100
                  )
                : 2;

              const status = req.status ? req.status : 'Pending';
              const isPending = !req.status;
              const statusClass = isPending ? 'pending' : req.status === '200' ? 'success' : 'error';
              const isExpanded = expandedRows.has(req.request_id);
              const isLogViewerOpen = openLogViewerIds.has(req.request_id);

              // Calculate prev/next request line ranges
              const prevRequest = reqIndex > 0 ? filteredHttpRequests[reqIndex - 1] : null;
              const nextRequest = reqIndex < filteredHttpRequests.length - 1 ? filteredHttpRequests[reqIndex + 1] : null;
              
              // Find line numbers by matching the log text
              const { rawLogLines } = useLogStore.getState();
              
              const findLineNumber = (logText: string): number => {
                if (!logText) return -1;
                const foundIndex = rawLogLines.findIndex(l => l.rawText === logText);
                return foundIndex;
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
                <div key={req.request_id}>
                  <div
                    className={`request-row ${isExpanded ? 'expanded' : ''} ${isPending ? 'pending' : ''}`}
                    onClick={() => toggleRowExpansion(req.request_id)}
                    style={{
                      gridTemplateColumns: '90px 300px 130px 65px 65px 75px 75px minmax(800px, 20fr)'
                    }}
                  >
                    <div
                      className="request-id clickable sticky-col"
                      style={{ left: '0' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLogViewerOpen) {
                          closeLogViewer(req.request_id);
                          if (expandedRows.has(req.request_id)) {
                            toggleRowExpansion(req.request_id);
                          }
                          return;
                        }
                        if (!isExpanded) {
                          toggleRowExpansion(req.request_id);
                        }
                        openLogViewer(req.request_id);
                      }}
                    >
                      {req.request_id}
                    </div>
                    <div className="uri sticky-col" style={{ left: '90px' }} title={req.uri}>{stripCommonPrefix(extractRelativeUri(req.uri), commonUriPrefix)}</div>
                    <div className="time sticky-col" style={{ left: '390px' }}>{isoToTime(req.request_time)}</div>
                    <div className="method">{req.method}</div>
                    <div className={`status ${statusClass}`}>{status}</div>
                    <div className="size">{req.request_size || '-'}</div>
                    <div className="size">{req.response_size || '-'}</div>
                    <div className="waterfall">
                      <div
                        className="waterfall-item"
                        style={{
                          left: `${relStart}%`,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div
                          className={`waterfall-bar ${isPending ? 'pending' : ''}`}
                          style={{
                            width: `calc((100vw - 200px) * ${Math.max(relDuration, 2)} / 100)`,
                            minWidth: '40px',
                          }}
                          title={`${req.request_duration_ms || '...'}ms`}
                        >
                        </div>
                        <span className="waterfall-duration">
                          {req.request_duration_ms ? `${req.request_duration_ms}ms` : '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded && isLogViewerOpen && (
                    <div className="details-row">
                      <div className="details-content single">
                        <div className="inline-log-viewer">
                          <div className="inline-log-body">
                            <LogDisplayView
                              requestFilter={`"${req.request_id}"`}
                              defaultShowOnlyMatching
                              prevRequestLineRange={prevRequestLineRange}
                              nextRequestLineRange={nextRequestLineRange}
                              onClose={() => {
                                closeLogViewer(req.request_id);
                                if (expandedRows.has(req.request_id)) {
                                  toggleRowExpansion(req.request_id);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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

function exportHttpRequestsToCSV(requests: HttpRequest[]): void {
  if (requests.length === 0) {
    alert('No data to export');
    return;
  }

  // CSV headers
  const headers = [
    'request_id',
    'request_time',
    'response_time',
    'method',
    'uri',
    'status',
    'request_size',
    'response_size',
    'request_duration_ms',
    'send_line',
    'response_line',
  ];

  // Build CSV content
  let csv = headers.join(',') + '\n';

  requests.forEach((req) => {
    const row = headers.map((h) => {
      const value = String(req[h as keyof HttpRequest] || '');
      // Escape quotes and wrap in quotes if contains comma or newline
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csv += row.join(',') + '\n';
  });

  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'http_requests.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
