/**
 * Default minimum scaling factor: 10ms = 1px
 * This constant ensures consistent scaling across timeline width, bar positions, and bar widths
 */
export const DEFAULT_MS_PER_PIXEL = 10;

/**
 * Convert milliseconds to minimum pixels using configurable scaling
 * @param durationMs - Duration in milliseconds
 * @param msPerPixel - Scaling factor (ms per pixel), defaults to 10
 * @returns Minimum pixel value for the given duration
 */
export function msToMinPixels(durationMs: number, msPerPixel = DEFAULT_MS_PER_PIXEL): number {
  return durationMs / msPerPixel;
}

/**
 * Calculate timeline width based on visible requests to optimize initial display
 * Uses configurable minimum scaling to ensure consistency with bar widths and positions
 * @param containerWidth - Available width in pixels
 * @param visibleTimes - Timestamps of first ~20 visible requests (in ms)
 * @param minTime - Minimum time across all requests
 * @param maxTime - Maximum time across all requests
 * @param msPerPixel - Scaling factor (ms per pixel), defaults to 10
 * @returns Object with timelineWidth and pixelsPerMs
 */
export function calculateTimelineWidth(
  containerWidth: number,
  visibleTimes: number[],
  minTime: number,
  maxTime: number,
  msPerPixel = DEFAULT_MS_PER_PIXEL
): { timelineWidth: number; pixelsPerMs: number } {
  const availableWaterfallWidth = Math.max(300, containerWidth);
  const totalDuration = Math.max(1, maxTime - minTime);

  // Scale timeline to fit first visible requests in available width
  const visibleMin = visibleTimes.length > 0 ? Math.min(...visibleTimes) : minTime;
  const visibleMax = visibleTimes.length > 0 ? Math.max(...visibleTimes) : maxTime;
  const visibleDuration = Math.max(1, visibleMax - visibleMin);

  const pixelsPerMs = availableWaterfallWidth / visibleDuration;
  const calculatedWidth = Math.max(availableWaterfallWidth, totalDuration * pixelsPerMs);
  
  // Apply configurable minimum scaling
  const dynamicMinWidth = msToMinPixels(totalDuration, msPerPixel);
  const timelineWidth = Math.max(calculatedWidth, dynamicMinWidth);

  return { timelineWidth, pixelsPerMs };
}

/**
 * Calculate waterfall position with configurable scaling to ensure alignment with bar widths.
 * @param requestTime - Request start time in milliseconds.
 * @param minTime - Minimum time across all requests.
 * @param totalDuration - Total duration of the timeline in milliseconds.
 * @param timelineWidth - Width of the timeline in pixels.
 * @param msPerPixel - Scaling factor (ms per pixel), defaults to 10.
 * @returns Horizontal position in pixels for the request on the waterfall timeline.
 */
export function getWaterfallPosition(
  requestTime: number,
  minTime: number,
  totalDuration: number,
  timelineWidth: number,
  msPerPixel = DEFAULT_MS_PER_PIXEL
): number {
  const calculatedPosition = ((requestTime - minTime) / totalDuration) * timelineWidth;
  // Apply same minimum scaling as bar widths
  const timeFromStart = requestTime - minTime;
  const dynamicMinPosition = msToMinPixels(timeFromStart, msPerPixel);
  return Math.max(calculatedPosition, dynamicMinPosition);
}

/**
 * Utility function to calculate bar width
 * Ensures duration is represented with configurable minimum scaling
 * For very short durations on large timelines, this prevents bars from becoming invisible
 * @param msPerPixel - Scaling factor (ms per pixel), defaults to 10
 */
export function getWaterfallBarWidth(
  durationMs: number,
  totalDuration: number,
  timelineWidth: number,
  msPerPixel = DEFAULT_MS_PER_PIXEL
): number {
  const calculatedWidth = (durationMs / totalDuration) * timelineWidth;
  // Dynamic minimum based on duration and scale, with a floor of 1px for any non-zero duration
  const dynamicMin = Math.max(1, msToMinPixels(durationMs, msPerPixel));
  return Math.max(calculatedWidth, dynamicMin);
}
