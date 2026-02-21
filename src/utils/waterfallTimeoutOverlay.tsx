import type { ReactNode } from 'react';
import type { HttpRequest } from '../types/log.types';
import { getWaterfallBarWidth } from './timelineUtils';

type TimeoutResolver = (req: HttpRequest) => number | undefined;

/**
 * Renders the timeout-exceeded (overflow) segment for a waterfall bar.
 *
 * The base bar stays status-colored up to timeout; only overflow after timeout
 * is rendered with warning color.
 */
export function renderTimeoutExceededOverlay(
  req: HttpRequest,
  barWidthPx: number,
  msPerPixel: number,
  totalDuration: number,
  timelineWidth: number,
  resolveTimeout: TimeoutResolver,
): ReactNode {
  const timeoutMs = resolveTimeout(req);

  if (timeoutMs === undefined || req.requestDurationMs <= timeoutMs) {
    return null;
  }

  const timeoutBoundaryPx = timeoutMs <= 0
    ? 0
    : getWaterfallBarWidth(timeoutMs, totalDuration, timelineWidth, msPerPixel);

  const splitLeftPx = Math.max(0, Math.min(timeoutBoundaryPx, barWidthPx));
  const exceededWidthPx = barWidthPx - splitLeftPx;

  if (exceededWidthPx <= 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: `${splitLeftPx}px`,
        width: `${exceededWidthPx}px`,
        height: '100%',
        background: 'var(--waterfall-timeout-exceeded)',
        pointerEvents: 'none',
      }}
    />
  );
}
