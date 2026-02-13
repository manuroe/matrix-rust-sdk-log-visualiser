import { useMemo } from 'react';
import { useLogStore } from '../stores/logStore';
import { applyTimeRangeFilterMicros } from '../utils/timeUtils';
import { RequestTable } from '../components/RequestTable';
import type { ColumnDef } from '../components/RequestTable';
import { extractRelativeUri, findCommonUriPrefix, stripCommonPrefix } from '../utils/uriUtils';
import { extractAvailableStatusCodes } from '../utils/statusCodeUtils';

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
    timelineScale,
    rawLogLines,
    getDisplayTime,
    setHidePendingHttp,
  } = useLogStore();

  // Calculate total considering time range filter
  const totalCount = useMemo(() => 
    applyTimeRangeFilterMicros(allHttpRequests, rawLogLines, startTime, endTime).length,
    [allHttpRequests, rawLogLines, startTime, endTime]
  );

  // Compute available status codes from all requests (including Pending)
  const availableStatusCodes = useMemo(
    () => extractAvailableStatusCodes(allHttpRequests),
    [allHttpRequests]
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
      label: '',
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
      msPerPixel={timelineScale}
      availableStatusCodes={availableStatusCodes}
      emptyMessage="No HTTP requests found in log file"
    />
  );
}
