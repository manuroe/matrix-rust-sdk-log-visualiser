/**
 * Log Message Utilities
 *
 * Pure helpers for parsing and normalising raw log message strings.
 * These functions are log-format-aware but have no React or store dependencies,
 * making them straightforward to unit-test in isolation.
 */

/**
 * Strip the ISO timestamp prefix and log-level token from a raw log message,
 * returning only the payload text.
 *
 * Matrix Rust SDK log lines follow the pattern:
 *   `<ISO-timestamp>  <LEVEL>  <payload>`
 *
 * For example:
 *   `"2026-01-28T13:24:43.950890Z  WARN  Something went wrong"`
 * becomes:
 *   `"Something went wrong"`
 *
 * This is used to group duplicate error/warning messages by their semantic
 * content rather than by the full raw text (which would never be equal because
 * each line has a unique timestamp).
 *
 * If the input does not match the expected pattern the original string is
 * returned unchanged so callers never receive an empty result unexpectedly.
 *
 * @param message - Raw log message string (may contain leading timestamp + level).
 * @returns The payload portion of the message, or the original string if no
 *   timestamp prefix is recognised.
 *
 * @example
 * extractCoreMessage("2026-01-28T13:24:43.950890Z WARN Something went wrong")
 * // => "Something went wrong"
 *
 * extractCoreMessage("No timestamp here")
 * // => "No timestamp here"
 */
export function extractCoreMessage(message: string): string {
  // Pattern: ISO timestamp followed by TRACE|DEBUG|INFO|WARN|ERROR and the payload.
  // The timestamp and level are separated from the payload by arbitrary whitespace.
  // Fractional seconds (".SSSSSS") and trailing "Z" are both made optional to match
  // all formats that logParser's extractISOTimestamp accepts.
  const match = message.match(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+(?:TRACE|DEBUG|INFO|WARN|ERROR)\s+(.+)$/
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return message;
}
