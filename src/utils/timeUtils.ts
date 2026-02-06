function normalizeIsoTimestamp(iso: string): string {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z)?$/);
  if (!match) return iso;

  const base = match[1];
  const fraction = match[2];
  const hasZ = Boolean(match[3]);

  if (fraction) {
    const ms = fraction.slice(0, 3).padEnd(3, '0');
    return `${base}.${ms}${hasZ ? 'Z' : 'Z'}`;
  }

  return `${base}${hasZ ? 'Z' : 'Z'}`;
}

export function timeToMs(timeStr: string): number {
  if (!timeStr) return 0;

  if (timeStr.includes('T')) {
    const normalized = normalizeIsoTimestamp(timeStr);
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const timeMatch = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
  if (!timeMatch) return 0;

  const [h, m, s] = timeStr.split(':').map(parseFloat);
  return h * 3600000 + m * 60000 + s * 1000;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if a string is a full ISO datetime (contains date portion)
 * Examples: "2022-04-15T09:45:19.968Z", "2022-04-15T09:45:19Z"
 */
function isFullISODatetime(timeStr: string): boolean {
  // Match YYYY-MM-DDTHH:MM:SS format (with optional fractional seconds and Z)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeStr);
}

/**
 * Convert time string to ISO datetime.
 * - If input is already full ISO datetime with date (2022-04-15T09:45:19.968Z), preserve it
 * - If input is time-only (HH:MM:SS.ffffff), prepend epoch date (1970-01-01T)
 * - Otherwise return input unchanged (for shortcuts, keywords, etc.)
 */
export function timeToISO(timeStr: string): string {
  if (!timeStr) return timeStr;
  
  // If already a full ISO datetime with date portion, preserve it unchanged
  if (isFullISODatetime(timeStr)) {
    return timeStr;
  }
  
  // Check if it's a time-only string (HH:MM:SS format)
  if (/^\d{2}:\d{2}:\d{2}/.test(timeStr)) {
    // Use epoch date as placeholder since logs only contain time
    return `1970-01-01T${timeStr}Z`;
  }
  
  // Return other inputs unchanged (shortcuts, keywords, etc.)
  return timeStr;
}

/**
 * Convert a millisecond timestamp to ISO string
 */
export function msToISO(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
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
  if (timeValue === 'start' || timeValue === 'end' || timeValue.startsWith('last')) {
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
  if (urlValue === 'start' || urlValue === 'end' || urlValue.startsWith('last')) {
    return urlValue;
  }
  // Convert ISO datetime with epoch date to time-only format (for backward compatibility)
  if (urlValue.includes('T') && urlValue.startsWith('1970-01-01T')) {
    return isoToTime(urlValue);
  }
  // If it's a full ISO datetime with actual date portion, preserve it unchanged
  if (urlValue.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(urlValue)) {
    return urlValue;
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

  // Handle shortcuts (hyphenated format)
  if (trimmed === 'start') return 'start';
  if (trimmed === 'last-min') return trimmed;
  if (trimmed === 'last-5-min') return trimmed;
  if (trimmed === 'last-10-min') return trimmed;
  if (trimmed === 'last-hour') return trimmed;
  if (trimmed === 'last-day') return trimmed;
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
      return trimmed;
    }
  }

  return null;
}

/**
 * Convert a shortcut to milliseconds offset from a reference time
 */
export function shortcutToMs(shortcut: string): number {
  const shortcuts: Record<string, number> = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'last-min': 60 * 1000,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'last-5-min': 5 * 60 * 1000,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'last-10-min': 10 * 60 * 1000,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'last-hour': 60 * 60 * 1000,
    // eslint-disable-next-line @typescript-eslint/naming-convention
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
    } else {
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
    } else {
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
 * Apply time range filter to a list of requests using rawLogLines for timestamps
 * Returns requests that fall within the time range (by responseLineNumber)
 */
export function applyTimeRangeFilter<T extends { responseLineNumber: number }>(
  requests: T[],
  rawLogLines: Array<{ lineNumber: number; timestampMs: number }>,
  startTime: string | null,
  endTime: string | null
): T[] {
  if (!startTime && !endTime) return requests;

  // Find max time from rawLogLines to use as reference
  const times = rawLogLines.map((l) => l.timestampMs).filter((t) => t > 0);
  const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;

  // Calculate actual start and end times
  const { startMs, endMs } = calculateTimeRange(startTime, endTime, maxLogTimeMs);

  return requests.filter((r) => {
    if (!r.responseLineNumber) return false;
    const responseLine = rawLogLines.find(l => l.lineNumber === r.responseLineNumber);
    if (!responseLine || !responseLine.timestampMs) return false;
    return responseLine.timestampMs >= startMs && responseLine.timestampMs <= endMs;
  });
}

