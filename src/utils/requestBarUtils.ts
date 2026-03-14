/**
 * Utilities for computing per-attempt waterfall bar segments in HTTP retry
 * requests. These are kept in `src/utils/` so they can be tested in isolation.
 */

import { getHttpStatusColor } from './httpStatusColors';

/**
 * Returns the CSS color string for a single retry-attempt outcome.
 * Numeric strings are treated as HTTP status codes; anything else is a client
 * error (transport failure such as a timeout or a connection refusal).
 *
 * @example
 * getAttemptSegmentColor('503') // → 'var(--http-503)'
 * @example
 * getAttemptSegmentColor('TimedOut') // → 'var(--http-client-error)'
 */
export function getAttemptSegmentColor(outcome: string): string {
  return /^\d+$/.test(outcome) ? getHttpStatusColor(outcome) : 'var(--http-client-error)';
}

/**
 * Computes per-attempt segment descriptors for a retried request waterfall bar.
 * Proportions are derived from attempt timestamps relative to total request
 * duration. The last segment absorbs any remaining pixels to eliminate rounding
 * gaps while ensuring all segment widths sum exactly to `barWidthPx`.
 *
 * @example
 * const segs = buildAttemptSegments(['TimedOut', '200'], [ts1, ts2], 62000, 620);
 * // → [{leftPx: 0, widthPx: ..., color: 'var(--http-client-error)'}, ...]
 */
export function buildAttemptSegments(
  outcomes: readonly string[],
  timestamps: readonly number[],
  totalMs: number,
  barWidthPx: number,
): Array<{ leftPx: number; widthPx: number; color: string }> {
  const segments: Array<{ leftPx: number; widthPx: number; color: string }> = [];
  let usedPx = 0;
  for (let i = 0; i < outcomes.length; i++) {
    const segStartUs = timestamps[i];
    const segEndUs = i < outcomes.length - 1 ? timestamps[i + 1] : timestamps[0] + totalMs * 1000;
    const segMs = (segEndUs - segStartUs) / 1000;
    const widthPx =
      i === outcomes.length - 1
        ? Math.max(0, barWidthPx - usedPx) // last segment gets the remainder
        : Math.max(0, Math.round((segMs / totalMs) * barWidthPx));
    segments.push({ leftPx: usedPx, widthPx, color: getAttemptSegmentColor(outcomes[i]) });
    usedPx += widthPx;
  }
  return segments;
}
