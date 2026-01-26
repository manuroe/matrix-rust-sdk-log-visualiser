import { useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { exportToCSV } from '../utils/logParser';
import { timeToMs } from '../utils/timeUtils';

export function SyncView() {
  const navigate = useNavigate();
  const {
    allRequests,
    filteredRequests,
    connectionIds,
    selectedConnId,
    hidePending,
    expandedRows,
    setSelectedConnId,
    setHidePending,
    toggleRowExpansion,
    clearData,
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
            filteredRequests.map((req) => {
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

              return (
                <div key={req.request_id}>
                  <div
                    className={`request-row ${isExpanded ? 'expanded' : ''} ${isPending ? 'pending' : ''}`}
                    onClick={() => toggleRowExpansion(req.request_id)}
                  >
                    <div className="request-id">{req.request_id}</div>
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
                  {isExpanded && (
                    <div className="details-row">
                      <div className="details-content">
                        <div className="detail-section">
                          <h4>Request Details</h4>
                          <div className="detail-item">
                            <span className="detail-label">Request ID</span>
                            <span className="detail-value">{req.request_id}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Method</span>
                            <span className="detail-value">{req.method}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Request Time</span>
                            <span className="detail-value">{req.request_time}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Request Size</span>
                            <span className="detail-value">{req.request_size}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Stream</span>
                            <span className="detail-value">{req.conn_id}</span>
                          </div>
                        </div>
                        <div className="detail-section">
                          <h4>Response Details</h4>
                          <div className="detail-item">
                            <span className="detail-label">Status</span>
                            <span className="detail-value">{req.status || 'Pending'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Response Time</span>
                            <span className="detail-value">{req.response_time || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Response Size</span>
                            <span className="detail-value">{req.response_size || '-'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Duration</span>
                            <span className="detail-value">
                              {req.request_duration_ms ? `${req.request_duration_ms}ms` : '-'}
                            </span>
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
