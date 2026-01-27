export function timeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(parseFloat);
  return h * 3600000 + m * 60000 + s * 1000;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convert time string (HH:MM:SS.ffffff) to ISO datetime using epoch date
 */
export function timeToISO(timeStr: string): string {
  if (!timeStr || !timeStr.match(/^\d{2}:\d{2}:\d{2}/)) return timeStr;
  // Use epoch date as placeholder since logs only contain time
  return `1970-01-01T${timeStr}Z`;
}

/**
 * Convert ISO datetime back to time-only format (HH:MM:SS.ffffff)
 */
export function isoToTime(isoStr: string): string {
  if (!isoStr) return isoStr;
  // Extract time portion from ISO datetime
  const match = isoStr.match(/T([\d:.]+)Z?$/);
  return match ? match[1] : isoStr;
}

/**
 * Convert a time value to URL-safe format (ISO for times, as-is for shortcuts)
 */
export function timeToURLFormat(timeValue: string | null): string | null {
  if (!timeValue) return null;
  // Keep shortcuts and keywords as-is
  if (timeValue === 'start' || timeValue === 'end' || timeValue.startsWith('last-')) {
    return timeValue;
  }
  // Convert time strings to ISO format
  return timeToISO(timeValue);
}

/**
 * Convert from URL format back to internal time format
 */
export function urlToTimeFormat(urlValue: string | null): string | null {
  if (!urlValue) return null;
  // Keep shortcuts and keywords as-is
  if (urlValue === 'start' || urlValue === 'end' || urlValue.startsWith('last-')) {
    return urlValue;
  }
  // Convert ISO datetime to time-only format
  if (urlValue.includes('T')) {
    return isoToTime(urlValue);
  }
  return urlValue;
}

/**
 * Parse a time string which can be either a shortcut like "last-5-min"
 * or an ISO time like "12:34:56.123456"
 */
export function parseTimeInput(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Handle shortcuts
  if (trimmed === 'start') return 'start';
  if (trimmed === 'last-min') return 'last-min';
  if (trimmed === 'last-5-min') return 'last-5-min';
  if (trimmed === 'last-10-min') return 'last-10-min';
  if (trimmed === 'last-hour') return 'last-hour';
  if (trimmed === 'last-day') return 'last-day';
  if (trimmed === 'end') return 'end';

  // Handle ISO time format (HH:MM:SS or HH:MM:SS.ffffff)
  const timeRegex = /^(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/;
  const match = trimmed.match(timeRegex);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const second = parseInt(match[3], 10);

    // Validate ranges
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
      return trimmed;
    }
  }

  // Handle full ISO datetime format (1970-01-01T12:34:56.123456Z)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(\.\d+)?Z?$/;
  const isoMatch = trimmed.match(isoRegex);
  if (isoMatch) {
    const hour = parseInt(isoMatch[1], 10);
    const minute = parseInt(isoMatch[2], 10);
    const second = parseInt(isoMatch[3], 10);

    // Validate ranges and extract just the time portion
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
      return isoToTime(trimmed);
    }
  }

  return null;
}

/**
 * Convert a shortcut to milliseconds offset from a reference time
 */
export function shortcutToMs(shortcut: string): number {
  const shortcuts: Record<string, number> = {
    'last-min': 60 * 1000,
    'last-5-min': 5 * 60 * 1000,
    'last-10-min': 10 * 60 * 1000,
    'last-hour': 60 * 60 * 1000,
    'last-day': 24 * 60 * 60 * 1000,
  };
  return shortcuts[shortcut] || 0;
}

/**
 * Get display name for a time value (shortcut or ISO time)
 */
export function getTimeDisplayName(timeValue: string | null): string {
  if (!timeValue) return '';
  if (timeValue === 'start') return 'Start of log';
  if (timeValue === 'end') return 'End of log';
  if (timeValue === 'last-min') return 'Last min';
  if (timeValue === 'last-5-min') return 'Last 5 min';
  if (timeValue === 'last-10-min') return 'Last 10 min';
  if (timeValue === 'last-hour') return 'Last hour';
  if (timeValue === 'last-day') return 'Last day';
  return timeValue;
}

/**
 * Calculate the actual time range given startTime and endTime values.
 * Returns { startMs, endMs } where endMs is the reference point (usually max log time)
 */
export function calculateTimeRange(
  startTime: string | null,
  endTime: string | null,
  maxLogTimeMs: number
): { startMs: number; endMs: number } {
  // Default: no filtering
  if (!startTime && !endTime) {
    return { startMs: 0, endMs: maxLogTimeMs };
  }

  // End time (reference point)
  let endMs = maxLogTimeMs;
  if (endTime) {
    if (endTime === 'end') {
      endMs = maxLogTimeMs;
    } else if (/^\d{2}:\d{2}:\d{2}/.test(endTime)) {
      endMs = timeToMs(endTime);
    }
  }

  // Start time
  let startMs = 0;
  if (startTime) {
    if (startTime === 'start') {
      // Start of log
      startMs = 0;
    } else if (startTime.startsWith('last-')) {
      // Shortcut: calculate offset from endTime
      const offsetMs = shortcutToMs(startTime);
      startMs = Math.max(0, endMs - offsetMs);
    } else if (/^\d{2}:\d{2}:\d{2}/.test(startTime)) {
      // ISO time
      startMs = timeToMs(startTime);
    }
  }

  return { startMs, endMs };
}

/**
 * Check if a timestamp is within the given time range
 */
export function isInTimeRange(
  timestamp: string,
  startMs: number,
  endMs: number
): boolean {
  const timeMs = timeToMs(timestamp);
  return timeMs >= startMs && timeMs <= endMs;
}

/**
 * Apply time range filter to a list of requests
 * Returns requests that fall within the time range (by response_time)
 */
export function applyTimeRangeFilter(
  requests: SyncRequest[],
  startTime: string | null,
  endTime: string | null
): SyncRequest[] {
  if (!startTime && !endTime) return requests;

  // Find max time from requests to use as reference
  const times = requests
    .map((r) => r.response_time)
    .filter((t) => t)
    .map(timeToMs);
  const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;

  // Calculate actual start and end times
  const { startMs, endMs } = calculateTimeRange(startTime, endTime, maxLogTimeMs);

  return requests.filter((r) => r.response_time && isInTimeRange(r.response_time, startMs, endMs));
}

// Import type for JSDoc
import type { SyncRequest } from '../types/log.types';
