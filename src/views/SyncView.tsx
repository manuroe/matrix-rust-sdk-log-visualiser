import { useLogStore } from '../stores/logStore';
import { exportToCSV } from '../utils/logParser';
import { timeToMs, applyTimeRangeFilter } from '../utils/timeUtils';
import { isoToTime } from '../utils/timeUtils';
import { LogDisplayView } from './LogDisplayView';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';

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
    setSelectedConnId,
    setHidePending,
    toggleRowExpansion,
    openLogViewer,
    closeLogViewer,
  } = useLogStore();

  const handleExportCSV = () => {
    exportToCSV(allRequests);
  };

  // Calculate total for selected connection, considering time range filter
  const connFilteredRequests = allRequests.filter(
    (r) => !selectedConnId || r.conn_id === selectedConnId
  );
  const totalForConn = applyTimeRangeFilter(connFilteredRequests, startTime, endTime).length;

  // Calculate timeline scale
  const times = filteredRequests
    .map((r) => r.request_time)
    .filter((t) => t)
    .map(timeToMs);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalDuration = Math.max(1, maxTime - minTime);

  return (
    <div className="app">
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
          <button onClick={handleExportCSV} className="btn-primary btn-compact">
            Export CSV
          </button>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header" style={{
          gridTemplateColumns: '90px 130px 65px 75px 75px minmax(800px, 20fr)'
        }}>
          <div className="sticky-col" style={{ left: '0' }}>Request</div>
          <div className="sticky-col" style={{ left: '90px' }}>Time</div>
          <div className="sticky-col" style={{ left: '220px' }}>Status</div>
          <div className="sticky-col" style={{ left: '285px' }}>↑ Size</div>
          <div className="sticky-col" style={{ left: '360px' }}>↓ Size</div>
          <div>Duration</div>
        </div>
        <div id="timeline-content">
          {filteredRequests.length === 0 ? (
            <div className="no-data">No sync requests found in log file</div>
          ) : (
            filteredRequests.map((req, reqIndex) => {
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
              const prevRequest = reqIndex > 0 ? filteredRequests[reqIndex - 1] : null;
              const nextRequest = reqIndex < filteredRequests.length - 1 ? filteredRequests[reqIndex + 1] : null;
              
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
                      gridTemplateColumns: '90px 130px 65px 75px 75px minmax(800px, 20fr)'
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
                    <div className="time sticky-col" style={{ left: '90px' }}>{isoToTime(req.request_time)}</div>
                    <div className={`status ${statusClass} sticky-col`} style={{ left: '220px' }}>{status}</div>
                    <div className="size sticky-col" style={{ left: '285px' }}>{req.request_size || '-'}</div>
                    <div className="size sticky-col" style={{ left: '360px' }}>{req.response_size || '-'}</div>
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
