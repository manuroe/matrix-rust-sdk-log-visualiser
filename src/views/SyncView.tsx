import { useMemo, useCallback } from 'react';
import { useLogStore } from '../stores/logStore';
import { applyTimeRangeFilterMicros } from '../utils/timeUtils';
import { RequestTable } from '../components/RequestTable';
import type { ColumnDef } from '../components/RequestTable';
import { extractAvailableStatusCodes } from '../utils/statusCodeUtils';
import type { SyncRequest, HttpRequest } from '../types/log.types';
import { useURLParams } from '../hooks/useURLParams';
import { renderTimeoutExceededOverlay } from '../utils/waterfallTimeoutOverlay';

/**
 * Sync Requests view - displays /sync requests in a timeline with waterfall visualization.
 * This is a thin wrapper around RequestTable with sync-specific columns and connection filtering.
 */
export function SyncView() {
  const {
    allRequests,
    filteredRequests,
    connectionIds,
    selectedConnId,
    selectedTimeout,
    hidePending,
    startTime,
    endTime,
    timelineScale,
    rawLogLines,
    getDisplayTime,
    setSelectedConnId,
    setHidePending,
    setSelectedTimeout,
  } = useLogStore();

  const { setTimeoutFilter } = useURLParams();

  // Calculate total for selected connection, considering time range filter
  const totalCount = useMemo(() => {
    const connFilteredRequests = allRequests.filter(
      (r) => !selectedConnId || r.connId === selectedConnId
    );
    return applyTimeRangeFilterMicros(connFilteredRequests, rawLogLines, startTime, endTime).length;
  }, [allRequests, selectedConnId, rawLogLines, startTime, endTime]);

  // Compute available status codes from all requests (including Pending)
  const availableStatusCodes = useMemo(
    () => extractAvailableStatusCodes(allRequests),
    [allRequests]
  );

  // Define columns for sync requests view (fewer columns than HTTP)
  const columns: ColumnDef[] = useMemo(() => [
    {
      id: 'requestId',
      label: 'Request',
      getValue: (req) => req.requestId,
    },
    {
      id: 'time',
      label: 'Time',
      className: 'time',
      getValue: (req) => getDisplayTime(req.sendLineNumber),
    },
    {
      id: 'requestSize',
      label: '↑ Size',
      className: 'size',
      getValue: (req) => req.requestSize || '-',
    },
    {
      id: 'responseSize',
      label: '↓ Size',
      className: 'size',
      getValue: (req) => req.responseSize || '-',
    },
  ], [getDisplayTime]);

  /**
   * Render the timeout-exceeded segment inside the bar.
   * The bar stays status-colored up to timeout; the overflow part is warning-colored.
   * timeout=0 means the whole duration is overflow if requestDurationMs > 0.
   */
  const renderBarOverlay = useCallback(
    (
      req: HttpRequest,
      barWidthPx: number,
      msPerPixel: number,
      totalDuration: number,
      timelineWidth: number
    ) => renderTimeoutExceededOverlay(
      req,
      barWidthPx,
      msPerPixel,
      totalDuration,
      timelineWidth,
      (request) => (request as SyncRequest).timeout,
    ),
    []
  );

  // Compute distinct timeout values present in the data, sorted ascending
  const availableTimeouts = useMemo(() => {
    const seen = new Set<number>();
    for (const r of allRequests) {
      if (r.timeout !== undefined) seen.add(r.timeout);
    }
    return Array.from(seen).sort((a, b) => a - b);
  }, [allRequests]);

  /** Human-readable label for a timeout value. */
  function formatTimeout(ms: number): string {
    if (ms === 0) return '0ms (catchup)';
    if (ms === 30000) return '30s (long-poll)';
    return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
  }

  // Connection selector + timeout selector for header
  const connectionSelector = (
    <>
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
      {availableTimeouts.length > 1 && (
        <select
          id="timeout-filter"
          value={selectedTimeout ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
            setSelectedTimeout(val);
            setTimeoutFilter(val);
          }}
          className="select-compact"
        >
          <option value="">All timeouts</option>
          {availableTimeouts.map((t) => (
            <option key={t} value={t}>
              {formatTimeout(t)}
            </option>
          ))}
        </select>
      )}
    </>
  );

  return (
    <RequestTable
      title="/sync requests"
      columns={columns}
      containerClassName="sync-view"
      filteredRequests={filteredRequests}
      totalCount={totalCount}
      hidePending={hidePending}
      onHidePendingChange={setHidePending}
      msPerPixel={timelineScale}
      availableStatusCodes={availableStatusCodes}
      headerSlot={connectionSelector}
      emptyMessage="No sync requests found in log file"
      rowSelector=".sync-view"
      showUriFilter={false}
      renderBarOverlay={renderBarOverlay}
    />
  );
}
