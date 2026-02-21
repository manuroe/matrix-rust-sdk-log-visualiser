/**
 * Unit tests for useChartInteraction edge-snapping logic.
 *
 * When a user drags to the first or last bar of the chart, the computed
 * time lands somewhere inside that bucket rather than exactly at the data
 * min/max.  handleMouseUp snaps the boundary to minTime / maxTime whenever
 * the raw value is within one bucket's time span of the edge.
 *
 * Test geometry (marginLeft = 0, so chart-x === event-x):
 *   xMax        = 1 000 px
 *   xScaleStep  =    10 px  (100 buckets)
 *   minTime     =         0 µs
 *   maxTime     = 1 000 000 µs  (1s range)
 *   bucketTimeSpan = (10 / 1000) × 1 000 000 = 10 000 µs
 *
 * Snap fires when:
 *   - rawStart  − minTime  < bucketTimeSpan  → startTime = minTime
 *   - maxTime   − rawEnd   < bucketTimeSpan  → endTime   = maxTime
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartInteraction } from '../useChartInteraction';
import type { TimestampMicros } from '../../types/time.types';

// ─── Mock @visx/event ────────────────────────────────────────────────────────
const mockLocalPoint = vi.fn();
vi.mock('@visx/event', () => ({
  localPoint: (e: unknown) => mockLocalPoint(e),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const X_MAX = 1_000;
const MIN_TIME = 0 as TimestampMicros;
const MAX_TIME = 1_000_000 as TimestampMicros; // 1 s
const X_SCALE_STEP = 10; // 100 buckets → bucketTimeSpan = 10 000 µs

/** Convert a chart-x position to the expected time value (no snapping). */
function xToTime(x: number): number {
  return MIN_TIME + (x / X_MAX) * (MAX_TIME - MIN_TIME);
}

function makeOptions(onTimeRangeSelected = vi.fn()) {
  return {
    marginLeft: 0,
    xMax: X_MAX,
    minTime: MIN_TIME,
    maxTime: MAX_TIME,
    formatTime: () => '00:00:00',
    hideTooltip: vi.fn(),
    onTimeRangeSelected,
    onResetZoom: vi.fn(),
    getBucketAtIndex: () => undefined,
    xScaleStep: X_SCALE_STEP,
    bucketCount: 100,
  };
}

/**
 * Simulate mouseDown → mouseMove → mouseUp.
 * Re-reads result.current.handlers after each act() to avoid stale closures.
 */
function simulateDrag(
  result: { current: ReturnType<typeof useChartInteraction> },
  startX: number,
  endX: number
) {
  // mouseDown: sets selectionStart and starts isSelecting
  mockLocalPoint.mockReturnValueOnce({ x: startX, y: 50 });
  act(() => {
    result.current.handlers.handleMouseDown({} as React.MouseEvent<SVGRectElement>);
  });

  // mouseMove: updates selectionEnd — read fresh handlers after state update
  mockLocalPoint.mockReturnValueOnce({ x: endX, y: 50 });
  act(() => {
    result.current.handlers.handleMouseMove(
      {} as React.MouseEvent<SVGRectElement>,
      vi.fn()
    );
  });

  // mouseUp: commits the selection — read fresh handlers after state update
  act(() => {
    result.current.handlers.handleMouseUp();
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useChartInteraction — edge snapping', () => {
  beforeEach(() => {
    mockLocalPoint.mockReset();
  });

  it('does NOT snap when selection is comfortably in the middle', () => {
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 200, 800);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [start, end] = onTimeRangeSelected.mock.calls[0];
    expect(start).toBe(xToTime(200)); // 200 000
    expect(end).toBe(xToTime(800));   // 800 000
  });

  it('snaps startTime to minTime when drag starts within one bucket of the left edge', () => {
    // Drag from x=500 → x=5; rawStart = min(500 000, 5 000) = 5 000
    // 5 000 − 0 = 5 000 < bucketTimeSpan (10 000) → snap to 0
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 500, 5);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [start, end] = onTimeRangeSelected.mock.calls[0];
    expect(start).toBe(MIN_TIME);
    expect(end).toBe(xToTime(500)); // 500 000 — no snap on end side
  });

  it('snaps endTime to maxTime when drag ends within one bucket of the right edge', () => {
    // Drag from x=200 → x=995; rawEnd = max(200 000, 995 000) = 995 000
    // 1 000 000 − 995 000 = 5 000 < 10 000 → snap to 1 000 000
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 200, 995);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [start, end] = onTimeRangeSelected.mock.calls[0];
    expect(start).toBe(xToTime(200)); // 200 000 — no snap on start side
    expect(end).toBe(MAX_TIME);
  });

  it('snaps both ends when selection covers essentially the full range', () => {
    // Drag from x=5 → x=995; rawStart=5 000 → 0, rawEnd=995 000 → 1 000 000
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 5, 995);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [start, end] = onTimeRangeSelected.mock.calls[0];
    expect(start).toBe(MIN_TIME);
    expect(end).toBe(MAX_TIME);
  });

  it('does NOT snap when selection starts just beyond one bucket from the left edge', () => {
    // rawStart = xToTime(15) = 15 000; 15 000 − 0 = 15 000 > 10 000 → no snap
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 500, 15);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [start] = onTimeRangeSelected.mock.calls[0];
    expect(start).toBe(xToTime(15));
    expect(start).not.toBe(MIN_TIME);
  });

  it('does NOT snap when selection ends just beyond one bucket from the right edge', () => {
    // rawEnd = xToTime(985) = 985 000; 1 000 000 − 985 000 = 15 000 > 10 000 → no snap
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 200, 985);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    const [, end] = onTimeRangeSelected.mock.calls[0];
    expect(end).toBe(xToTime(985));
    expect(end).not.toBe(MAX_TIME);
  });

  it('does not fire onTimeRangeSelected for a tiny selection (< 100 ms)', () => {
    // x=500 → x=502: range = 2 000 µs = 2 ms < 100 ms threshold
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 500, 502);

    expect(onTimeRangeSelected).not.toHaveBeenCalled();
  });

  it('fires onTimeRangeSelected exactly once and clears selection state after mouseUp', () => {
    const onTimeRangeSelected = vi.fn();
    const { result } = renderHook(() => useChartInteraction(makeOptions(onTimeRangeSelected)));

    simulateDrag(result, 100, 900);

    expect(onTimeRangeSelected).toHaveBeenCalledTimes(1);
    expect(result.current.state.isSelecting).toBe(false);
    expect(result.current.state.selectionStart).toBeUndefined();
    expect(result.current.state.selectionEnd).toBeUndefined();
  });
});
