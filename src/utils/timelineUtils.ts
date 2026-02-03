/**
 * Calculate timeline width based on visible requests to optimize initial display
 * @param containerWidth - Available width in pixels
 * @param visibleTimes - Timestamps of first ~20 visible requests (in ms)
 * @param minTime - Minimum time across all requests
 * @param maxTime - Maximum time across all requests
 * @returns Object with timelineWidth and pixelsPerMs
 */
export function calculateTimelineWidth(
  containerWidth: number,
  visibleTimes: number[],
  minTime: number,
  maxTime: number
): { timelineWidth: number; pixelsPerMs: number } {
  const availableWaterfallWidth = Math.max(300, containerWidth);
  const totalDuration = Math.max(1, maxTime - minTime);

  // Scale timeline to fit first visible requests in available width
  const visibleMin = visibleTimes.length > 0 ? Math.min(...visibleTimes) : minTime;
  const visibleMax = visibleTimes.length > 0 ? Math.max(...visibleTimes) : maxTime;
  const visibleDuration = Math.max(1, visibleMax - visibleMin);

  const pixelsPerMs = availableWaterfallWidth / visibleDuration;
  const timelineWidth = Math.max(availableWaterfallWidth, totalDuration * pixelsPerMs);

  return { timelineWidth, pixelsPerMs };
}

/**
 * Utility function to calculate pixel position for a request
 */
export function getWaterfallPosition(
  requestTime: number,
  minTime: number,
  totalDuration: number,
  timelineWidth: number
): number {
  return ((requestTime - minTime) / totalDuration) * timelineWidth;
}

/**
 * Utility function to calculate bar width
 */
export function getWaterfallBarWidth(
  durationMs: number,
  totalDuration: number,
  timelineWidth: number,
  minWidth: number = 2
): number {
  const calculatedWidth = (durationMs / totalDuration) * timelineWidth;
  return Math.max(calculatedWidth, minWidth);
}
