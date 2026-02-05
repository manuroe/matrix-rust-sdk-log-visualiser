import { useMemo } from 'react';
import { useLogStore } from '../stores/logStore';
import { applyTimeRangeFilter } from '../utils/timeUtils';
import { RequestTable } from '../components/RequestTable';
import type { ColumnDef } from '../components/RequestTable';
import { extractRelativeUri, findCommonUriPrefix, stripCommonPrefix } from '../utils/uriUtils';

/**
 * HTTP Requests view - displays all HTTP requests in a timeline with waterfall visualization.
 * This is a thin wrapper around RequestTable with HTTP-specific columns and URI prefix stripping.
 */
export function HttpRequestsView() {
  const {
    allHttpRequests,
    filteredHttpRequests,
    hidePendingHttp,
    startTime,
    endTime,
    rawLogLines,
    getDisplayTime,
    setHidePendingHttp,
  } = useLogStore();

  // Calculate total considering time range filter
  const totalCount = useMemo(() => 
    applyTimeRangeFilter(allHttpRequests, rawLogLines, startTime, endTime).length,
    [allHttpRequests, rawLogLines, startTime, endTime]
  );

  // Find common URI prefix to strip from display
  const commonUriPrefix = useMemo(() => 
    findCommonUriPrefix(filteredHttpRequests.map(r => r.uri)),
    [filteredHttpRequests]
  );

  // Define columns for HTTP requests view
  const columns: ColumnDef[] = useMemo(() => [
    {
      id: 'requestId',
      label: 'Request',
      getValue: (req) => req.requestId,
    },
    {
      id: 'uri',
      label: 'URI',
      className: 'uri',
      getValue: (req) => stripCommonPrefix(extractRelativeUri(req.uri), commonUriPrefix),
    },
    {
      id: 'time',
      label: 'Time',
      className: 'time',
      getValue: (req) => getDisplayTime(req.sendLineNumber),
    },
    {
      id: 'method',
      label: 'Method',
      className: 'method',
      getValue: (req) => req.method,
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
  ], [commonUriPrefix, getDisplayTime]);

  return (
    <RequestTable
      title="HTTP Requests"
      columns={columns}
      filteredRequests={filteredHttpRequests}
      totalCount={totalCount}
      hidePending={hidePendingHttp}
      onHidePendingChange={setHidePendingHttp}
      emptyMessage="No HTTP requests found in log file"
    />
  );
}
