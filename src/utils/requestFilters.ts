/**
 * Pure filter functions for sync and HTTP requests.
 *
 * These are extracted from logStore so they can be unit-tested in isolation
 * without Zustand setup. The store calls these and stores results.
 */

import type { HttpRequest, SyncRequest, ParsedLogLine } from '../types/log.types';
import type { TimestampMicros, TimeFilterValue } from '../types/time.types';
import { calculateTimeRangeMicros } from './timeUtils';

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
  rawLogLines: Array<{ timestampUs: TimestampMicros }>,
  startFilter: TimeFilterValue | null,
  endFilter: TimeFilterValue | null
): { startUs: TimestampMicros; endUs: TimestampMicros } | null {
  if (!startFilter && !endFilter) return null;

  const times = rawLogLines.map((l) => l.timestampUs).filter((t) => t > 0);
  const minLogTimeUs: TimestampMicros = times.length > 0 ? (Math.min(...times) as TimestampMicros) : 0;
  const maxLogTimeUs: TimestampMicros = times.length > 0 ? (Math.max(...times) as TimestampMicros) : 0;

  return calculateTimeRangeMicros(startFilter, endFilter, minLogTimeUs, maxLogTimeUs);
}

/**
 * Return true when the request's response line falls inside the given microsecond range.
 * Requests with no response line (responseLineNumber === 0) are never excluded by the
 * time filter — they are always "in scope" (incomplete requests belong to every window).
 */
function isResponseInTimeRange(
  responseLineNumber: number,
  rawLogLines: ParsedLogLine[],
  timeRangeUs: { startUs: TimestampMicros; endUs: TimestampMicros }
): boolean {
  if (!responseLineNumber) return true; // incomplete — never filtered by time
  const responseLine = rawLogLines.find((l) => l.lineNumber === responseLineNumber);
  if (!responseLine || !responseLine.timestampUs) return true; // no timestamp data — keep it
  return (
    responseLine.timestampUs >= timeRangeUs.startUs &&
    responseLine.timestampUs <= timeRangeUs.endUs
  );
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

    // Status code filter (null = all enabled)
    if (statusCodeFilter !== null) {
      const statusKey = r.status || 'Incomplete';
      if (!statusCodeFilter.has(statusKey)) return false;
    }

    // Time filter (incomplete requests always pass)
    if (timeRangeUs && !isResponseInTimeRange(r.responseLineNumber, rawLogLines, timeRangeUs)) {
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
    // Incomplete filter
    if (!showIncompleteHttp && !r.status) return false;

    // Status code filter (null = all enabled)
    if (statusCodeFilter !== null) {
      const statusKey = r.status || 'Incomplete';
      if (!statusCodeFilter.has(statusKey)) return false;
    }

    // URI filter (case-insensitive substring match)
    if (uriFilter && uriFilter.length > 0) {
      if (!r.uri.toLowerCase().includes(uriFilter.toLowerCase())) return false;
    }

    // Time filter (incomplete requests always pass)
    if (timeRangeUs && !isResponseInTimeRange(r.responseLineNumber, rawLogLines, timeRangeUs)) {
      return false;
    }

    return true;
  });
}
