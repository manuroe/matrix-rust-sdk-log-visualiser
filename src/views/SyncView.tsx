import { useMemo } from 'react';
import { useLogStore } from '../stores/logStore';
import { applyTimeRangeFilter } from '../utils/timeUtils';
import { RequestTable } from '../components/RequestTable';
import type { ColumnDef } from '../components/RequestTable';

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
    hidePending,
    startTime,
    endTime,
    rawLogLines,
    getDisplayTime,
    setSelectedConnId,
    setHidePending,
  } = useLogStore();

  // Calculate total for selected connection, considering time range filter
  const totalCount = useMemo(() => {
    const connFilteredRequests = allRequests.filter(
      (r) => !selectedConnId || r.connId === selectedConnId
    );
    return applyTimeRangeFilter(connFilteredRequests, rawLogLines, startTime, endTime).length;
  }, [allRequests, selectedConnId, rawLogLines, startTime, endTime]);

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

  // Connection selector dropdown for header
  const connectionSelector = (
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
      headerSlot={connectionSelector}
      emptyMessage="No sync requests found in log file"
      rowSelector=".sync-view"
    />
  );
}
