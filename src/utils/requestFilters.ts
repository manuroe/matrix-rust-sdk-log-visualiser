/**
 * Pure filter functions for sync and HTTP requests.
 *
 * These are extracted from logStore so they can be unit-tested in isolation
 * without Zustand setup. The store calls these and stores results.
 */

import type { HttpRequest, SyncRequest, ParsedLogLine } from '../types/log.types';
import type { TimestampMicros, TimeFilterValue } from '../types/time.types';
import { calculateTimeRangeMicros, getMinMaxTimestamps } from './timeUtils';
import { INCOMPLETE_STATUS_KEY, CLIENT_ERROR_STATUS_KEY } from './statusCodeUtils';

export interface SyncRequestFilters {
  selectedConnId: string;
  showIncomplete: boolean;
  selectedTimeout: number | null;
  statusCodeFilter: Set<string> | null;
  startTime: TimeFilterValue | null;
  endTime: TimeFilterValue | null;
}

export interface HttpRequestFilters {
  showIncompleteHttp: boolean;
  statusCodeFilter: Set<string> | null;
  uriFilter: string | null;
  startTime: TimeFilterValue | null;
  endTime: TimeFilterValue | null;
}

/**
 * Derive a microsecond time range from rawLogLines + filter values.
 * Returns null when no filter is active (callers treat null as "no time constraint").
 */
export function getTimeRangeUs(
  rawLogLines: ReadonlyArray<{ timestampUs: TimestampMicros }>,
  startFilter: TimeFilterValue | null,
  endFilter: TimeFilterValue | null
): { startUs: TimestampMicros; endUs: TimestampMicros } | null {
  if (!startFilter && !endFilter) return null;

  const { min: minLogTimeUs, max: maxLogTimeUs } = getMinMaxTimestamps(rawLogLines);
  if (minLogTimeUs === 0 && maxLogTimeUs === 0) return null;

  return calculateTimeRangeMicros(startFilter, endFilter, minLogTimeUs, maxLogTimeUs);
}

/**
 * Return true when the request falls inside the given microsecond range.
 * For completed requests we use the response timestamp; for incomplete requests
 * (no response line) we fall back to the send timestamp.
 */
function isRequestInTimeRange(
  request: Pick<HttpRequest, 'responseLineNumber' | 'sendLineNumber'>,
  rawLogLines: ParsedLogLine[],
  timeRangeUs: { startUs: TimestampMicros; endUs: TimestampMicros }
): boolean {
  const lineNumber = request.responseLineNumber || request.sendLineNumber;
  if (!lineNumber) return false;

  const line = rawLogLines.find((l) => l.lineNumber === lineNumber);
  if (!line || !line.timestampUs) return false;

  return line.timestampUs >= timeRangeUs.startUs && line.timestampUs <= timeRangeUs.endUs;
}

/**
 * Filter sync (sliding-sync) requests according to current filter state.
 */
export function filterSyncRequests(
  requests: SyncRequest[],
  rawLogLines: ParsedLogLine[],
  filters: SyncRequestFilters
): SyncRequest[] {
  const { selectedConnId, showIncomplete, selectedTimeout, statusCodeFilter, startTime, endTime } =
    filters;

  const timeRangeUs = getTimeRangeUs(rawLogLines, startTime, endTime);

  return requests.filter((r) => {
    // Connection filter
    if (selectedConnId && r.connId !== selectedConnId) return false;

    // Timeout filter
    if (selectedTimeout !== null && r.timeout !== selectedTimeout) return false;

    // Incomplete filter
    if (!showIncomplete && !r.status) return false;

    // Status code filter (null = all enabled).
    // A request matches if its final status matches OR any intermediate attempt outcome matches,
    // so retried requests (e.g. 503 → 200) appear when filtering for either code.
    if (statusCodeFilter !== null) {
      const statusKey = r.status || 'Incomplete';
      const matchesFinal = statusCodeFilter.has(statusKey);
      // Map non-numeric outcomes (e.g. 'TimedOut') to CLIENT_ERROR_STATUS_KEY so filtering
      // for 'Client Error' also includes requests with intermediate transport failures.
      const matchesAttempt = r.attemptOutcomes?.some((o) =>
        statusCodeFilter.has(/^\d+$/.test(o) ? o : CLIENT_ERROR_STATUS_KEY)
      ) ?? false;
      if (!matchesFinal && !matchesAttempt) return false;
    }

    // Time filter
    if (timeRangeUs && !isRequestInTimeRange(r, rawLogLines, timeRangeUs)) {
      return false;
    }

    return true;
  });
}

/**
 * Filter general HTTP requests according to current filter state.
 */
export function filterHttpRequests(
  requests: HttpRequest[],
  rawLogLines: ParsedLogLine[],
  filters: HttpRequestFilters
): HttpRequest[] {
  const { showIncompleteHttp, statusCodeFilter, uriFilter, startTime, endTime } = filters;

  const timeRangeUs = getTimeRangeUs(rawLogLines, startTime, endTime);

  return requests.filter((r) => {
    // Incomplete filter — client errors always show (they are resolved, not truly incomplete)
    if (!showIncompleteHttp && !r.status && !r.clientError) return false;

    // Status code filter (null = all enabled).
    // A request matches if its final status matches OR any intermediate attempt outcome matches,
    // so retried requests (e.g. 503 → 200) appear when filtering for either code.
    if (statusCodeFilter !== null) {
      const statusKey = r.status || (r.clientError ? CLIENT_ERROR_STATUS_KEY : INCOMPLETE_STATUS_KEY);
      const matchesFinal = statusCodeFilter.has(statusKey);
      // Map non-numeric outcomes (e.g. 'TimedOut') to CLIENT_ERROR_STATUS_KEY so filtering
      // for 'Client Error' also includes requests with intermediate transport failures.
      const matchesAttempt = r.attemptOutcomes?.some((o) =>
        statusCodeFilter.has(/^\d+$/.test(o) ? o : CLIENT_ERROR_STATUS_KEY)
      ) ?? false;
      if (!matchesFinal && !matchesAttempt) return false;
    }

    // URI filter (case-insensitive substring match)
    if (uriFilter && uriFilter.length > 0) {
      if (!r.uri.toLowerCase().includes(uriFilter.toLowerCase())) return false;
    }

    // Time filter
    if (timeRangeUs && !isRequestInTimeRange(r, rawLogLines, timeRangeUs)) {
      return false;
    }

    return true;
  });
}
