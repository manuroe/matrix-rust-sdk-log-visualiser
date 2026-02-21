/**
 * Time Type Definitions
 * 
 * This module defines the canonical time representations used throughout the application.
 * 
 * ## Input Format
 * Log files contain ISO 8601 datetime strings in UTC with microsecond precision:
 * `2026-01-26T16:01:13.382222Z`
 * 
 * ## Internal Representation
 * Internally, timestamps are stored as microseconds since Unix epoch (UTC).
 * This preserves full precision and enables efficient arithmetic operations.
 * 
 * ## Display Format
 * For display, timestamps are formatted as time-only strings (UTC):
 * - `HH:MM:SS` for compact display
 * - `HH:MM:SS.ssssss` for full precision
 * - Full ISO for exports/URLs
 * 
 * ## URL Format
 * URLs use full ISO 8601 datetime strings or shortcuts like 'last-5-min'.
 */

/**
 * Microseconds since Unix epoch (1970-01-01T00:00:00Z).
 * Preserves full 6-digit fractional second precision from logs.
 * 
 * JavaScript numbers can safely represent values up to 2^53-1,
 * which covers dates well beyond year 285616 with microsecond precision.
 */
export type TimestampMicros = number;

/**
 * Duration in microseconds.
 * Used for time differences and intervals.
 */
export type DurationMicros = number;

/**
 * ISO 8601 datetime string in UTC with optional microsecond precision.
 * Examples:
 * - "2026-01-26T16:01:13Z"
 * - "2026-01-26T16:01:13.382222Z"
 */
export type ISODateTimeString = string;

/**
 * Time shortcuts for relative time filtering.
 * These are relative to the end of the log or current time.
 */
export type TimeShortcut = 
  | 'last-min'
  | 'last-5-min'
  | 'last-10-min'
  | 'last-hour'
  | 'last-day';

/**
 * Special time keywords.
 */
export type TimeKeyword = 'start' | 'end';

/**
 * Valid values for time filter inputs.
 * Can be:
 * - Full ISO datetime string (with date portion)
 * - Time shortcut ('last-5-min', etc.)
 * - Keyword ('start', 'end')
 * - null (no filter)
 */
export type TimeFilterValue = ISODateTimeString | TimeShortcut | TimeKeyword;

/**
 * Time display format options.
 */
export type TimeDisplayFormat = 
  | 'HH:MM'           // "16:01"
  | 'HH:MM:SS'        // "16:01:13"  
  | 'HH:MM:SS.us'     // "16:01:13.382222"
  | 'ISO';            // "2026-01-26T16:01:13.382222Z"

/**
 * Conversion constants
 */
export const MICROS_PER_MILLISECOND = 1000;
export const MICROS_PER_SECOND = 1_000_000;
export const MICROS_PER_MINUTE = 60 * MICROS_PER_SECOND;
export const MICROS_PER_HOUR = 60 * MICROS_PER_MINUTE;
export const MICROS_PER_DAY = 24 * MICROS_PER_HOUR;

/**
 * Type guard to check if a string is a time shortcut.
 */
export function isTimeShortcut(value: string): value is TimeShortcut {
  return ['last-min', 'last-5-min', 'last-10-min', 'last-hour', 'last-day'].includes(value);
}

/**
 * Type guard to check if a string is a time keyword.
 */
export function isTimeKeyword(value: string): value is TimeKeyword {
  return value === 'start' || value === 'end';
}

/**
 * Type guard to check if a string is a valid time filter value (shortcut or keyword).
 */
export function isTimeFilterShortcutOrKeyword(value: string): value is TimeShortcut | TimeKeyword {
  return isTimeShortcut(value) || isTimeKeyword(value);
}
