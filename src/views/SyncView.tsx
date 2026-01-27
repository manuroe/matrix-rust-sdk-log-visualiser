import { useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { exportToCSV } from '../utils/logParser';
import { timeToMs } from '../utils/timeUtils';
import { LogDisplayView } from './LogDisplayView';

export function SyncView() {
  const navigate = useNavigate();
  const {
    allRequests,
    filteredRequests,
    connectionIds,
    selectedConnId,
    hidePending,
    expandedRows,
    openLogViewerIds,
    setSelectedConnId,
    setHidePending,
    toggleRowExpansion,
    clearData,
    openLogViewer,
    closeLogViewer,
  } = useLogStore();

  const handleLoadNewFile = () => {
    clearData();
    navigate('/');
  };

  const handleExportCSV = () => {
    exportToCSV(allRequests);
  };

  const totalForConn = allRequests.filter(
    (r) => !selectedConnId || r.conn_id === selectedConnId
  ).length;

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
      <div className="header">
        <h1>
          Matrix Rust SDK Log Visualiser: <code className="inline-code">/http_requests/sync</code> requests
        </h1>
        <div className="controls">
          <button onClick={handleLoadNewFile} className="btn-secondary">
            Load New File
          </button>
          <select
            id="conn-filter"
            value={selectedConnId}
            onChange={(e) => setSelectedConnId(e.target.value)}
          >
            {connectionIds.map((connId) => (
              <option key={connId} value={connId}>
                {connId}
              </option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555' }}>
            <input
              type="checkbox"
              id="hide-pending"
              checked={hidePending}
              onChange={(e) => setHidePending(e.target.checked)}
            />
            Hide pending
          </label>
          <div className="stats">
            <span id="shown-count">{filteredRequests.length}</span> /{' '}
            <span id="total-count">{totalForConn}</span> requests
          </div>
          <button onClick={handleExportCSV} className="btn-primary push-right">
            Export CSV
          </button>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          <div>Request</div>
          <div>Timeline</div>
          <div>Status</div>
          <div>↑ Size</div>
          <div>↓ Size</div>
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
                  >
                    <div
                      className="request-id clickable"
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
                    <div className="time">{req.request_time}</div>
                    <div className={`status ${statusClass}`}>{status}</div>
                    <div className="size">{req.request_size || '-'}</div>
                    <div className="size">{req.response_size || '-'}</div>
                    <div className="waterfall">
                      <div
                        className={`waterfall-bar ${isPending ? 'pending' : ''}`}
                        style={{
                          left: `${relStart}%`,
                          width: `${Math.max(relDuration, 2)}%`,
                          minWidth: '40px',
                        }}
                        title={`${req.request_duration_ms || '...'}ms`}
                      >
                        {req.request_duration_ms ? `${req.request_duration_ms}ms` : '...'}
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
