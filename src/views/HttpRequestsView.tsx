import { useMemo, useCallback } from 'react';
import { useLogStore } from '../stores/logStore';
import { countRequestsForTimeRange } from '../utils/timeUtils';
import { RequestTable } from '../components/RequestTable';
import type { ColumnDef } from '../components/RequestTable';
import { extractRelativeUri, findCommonUriPrefix, stripCommonPrefix } from '../utils/uriUtils';
import { extractAvailableStatusCodes } from '../utils/statusCodeUtils';
import type { HttpRequest } from '../types/log.types';
import { renderTimeoutExceededOverlay } from '../utils/waterfallTimeoutOverlay';
import { getSyncRequestBarColor } from '../utils/syncRequestColors';

/**
 * HTTP Requests view - displays all HTTP requests in a timeline with waterfall visualization.
 * This is a thin wrapper around RequestTable with HTTP-specific columns and URI prefix stripping.
 */
export function HttpRequestsView() {
  const {
    allHttpRequests,
    allRequests,
    filteredHttpRequests,
    showPendingHttp,
    startTime,
    endTime,
    timelineScale,
    rawLogLines,
    getDisplayTime,
    setShowPendingHttp,
  } = useLogStore();

  const totalCount = useMemo(
    () => countRequestsForTimeRange(allHttpRequests, rawLogLines, startTime, endTime),
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

  // Timeout lookup by request id (sync metadata is stored in allRequests)
  const timeoutByRequestId = useMemo(() => {
    const map = new Map<string, number>();
    for (const req of allRequests) {
      if (req.timeout !== undefined) {
        map.set(req.requestId, req.timeout);
      }
    }
    return map;
  }, [allRequests]);

  /**
   * Apply sync-specific bar colors for /sync requests (catchup vs long-poll).
   * HttpRequest objects don't carry timeout directly, so we enrich from the map.
   */
  const getBarColor = useCallback(
    (req: HttpRequest, defaultColor: string) => {
      const timeout = timeoutByRequestId.get(req.requestId);
      const enriched = timeout !== undefined ? { ...req, timeout } : req;
      return getSyncRequestBarColor(enriched, defaultColor);
    },
    [timeoutByRequestId]
  );

  /**
   * Render timeout-exceeded segment for sync long-poll requests.
   * For requests with timeout metadata, the overflow after timeout is highlighted.
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
      (request) => timeoutByRequestId.get(request.requestId),
    ),
    [timeoutByRequestId]
  );

  return (
    <RequestTable
      title="HTTP Requests"
      columns={columns}
      filteredRequests={filteredHttpRequests}
      totalCount={totalCount}
      showPending={showPendingHttp}
      onShowPendingChange={setShowPendingHttp}
      msPerPixel={timelineScale}
      availableStatusCodes={availableStatusCodes}
      emptyMessage="No HTTP requests found in log file"
      renderBarOverlay={renderBarOverlay}
      getBarColor={getBarColor}
    />
  );
}
