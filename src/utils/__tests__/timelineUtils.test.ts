import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MS_PER_PIXEL,
  msToMinPixels,
  calculateTimelineWidth,
  getWaterfallPosition,
  getWaterfallBarWidth,
  computeAutoScale,
} from '../timelineUtils';

describe('timelineUtils', () => {
  describe('msToMinPixels', () => {
    it('divides duration by default msPerPixel', () => {
      // Uses default parameter (DEFAULT_MS_PER_PIXEL = 10)
      expect(msToMinPixels(100)).toBe(100 / DEFAULT_MS_PER_PIXEL);
    });

    it('divides duration by explicit msPerPixel', () => {
      expect(msToMinPixels(200, 20)).toBe(10);
    });

    it('returns 0 for 0ms duration', () => {
      expect(msToMinPixels(0)).toBe(0);
      expect(msToMinPixels(0, 5)).toBe(0);
    });
  });

  describe('calculateTimelineWidth', () => {
    it('uses default msPerPixel when not supplied', () => {
      const { timelineWidth, pixelsPerMs } = calculateTimelineWidth(300, [], 0, 1_000);
      // totalDuration = 1000, dynamicWidth = 1000/10 = 100; max(300, 100) = 300
      expect(timelineWidth).toBe(300);
      expect(pixelsPerMs).toBe(300 / 1_000);
    });

    it('expands timeline when dynamic width exceeds container width', () => {
      // totalDuration = 100_000ms, msPerPixel = 10 → dynamicWidth = 10_000px > 800px container
      const { timelineWidth } = calculateTimelineWidth(800, [], 0, 100_000, 10);
      expect(timelineWidth).toBe(100_000 / 10); // 10_000
    });

    it('uses container width when dynamic width is smaller', () => {
      // totalDuration = 100ms, msPerPixel = 10 → dynamicWidth = 10 < 800
      const { timelineWidth } = calculateTimelineWidth(800, [], 0, 100, 10);
      expect(timelineWidth).toBe(800);
    });

    it('enforces minimum container width of 300px', () => {
      // containerWidth = 50 → availableWaterfallWidth = max(300, 50) = 300
      const { timelineWidth } = calculateTimelineWidth(50, [], 0, 10, 10);
      expect(timelineWidth).toBe(300);
    });

    it('handles maxTime === minTime (zero duration)', () => {
      // totalDuration = max(1, 0) = 1
      const { timelineWidth, pixelsPerMs } = calculateTimelineWidth(800, [], 500, 500, 10);
      expect(timelineWidth).toBe(800);
      expect(pixelsPerMs).toBe(800 / 1);
    });
  });

  describe('getWaterfallPosition', () => {
    it('uses default msPerPixel when not supplied', () => {
      // requestTime=100, minTime=0, totalDuration=1000, timelineWidth=10_000
      const pos = getWaterfallPosition(100, 0, 1_000, 10_000);
      // calculatedPosition = (100/1000)*10_000 = 1_000
      // dynamicMinPosition = msToMinPixels(100) = 10
      // max(1000, 10) = 1000
      expect(pos).toBe(1000);
    });

    it('uses dynamic min position when calculated position is smaller', () => {
      // Small requestTime relative to large totalDuration → calculatedPosition tiny
      // requestTime=1, minTime=0, totalDuration=1_000_000, timelineWidth=100
      const pos = getWaterfallPosition(1, 0, 1_000_000, 100, 10);
      // calculatedPosition = (1/1_000_000)*100 = 0.0001
      // dynamicMinPosition = 1/10 = 0.1
      // max(0.0001, 0.1) = 0.1
      expect(pos).toBeCloseTo(0.1);
    });
  });

  describe('getWaterfallBarWidth', () => {
    it('uses default msPerPixel when not supplied', () => {
      const w = getWaterfallBarWidth(100, 1_000, 10_000);
      // calculatedWidth = (100/1000)*10_000 = 1_000
      // dynamicMin = max(1, 100/10) = max(1, 10) = 10
      expect(w).toBe(1_000);
    });

    it('enforces minimum of 1px for zero-duration bars', () => {
      const w = getWaterfallBarWidth(0, 1_000, 10_000, 10);
      // calculatedWidth = 0
      // dynamicMin = max(1, 0/10) = max(1, 0) = 1
      expect(w).toBe(1);
    });

    it('uses dynamicMin when calculated width is small', () => {
      // Very short duration compared to total
      const w = getWaterfallBarWidth(1, 1_000_000, 100, 10);
      // calculatedWidth = (1/1_000_000)*100 = 0.0001
      // dynamicMin = max(1, 1/10) = max(1, 0.1) = 1
      expect(w).toBe(1);
    });
  });

  describe('computeAutoScale', () => {
    const makeEntries = (pairs: [number, number][]) =>
      pairs.map(([startTime, endTime]) => ({ startTime, endTime }));

    it('returns null for empty timeData', () => {
      expect(computeAutoScale([], 800)).toBeNull();
    });

    it('returns null when containerWidth is zero', () => {
      const data = makeEntries([[0, 5000]]);
      expect(computeAutoScale(data, 0)).toBeNull();
    });

    it('returns null when span is zero (all requests at same instant)', () => {
      const data = makeEntries([[1000, 1000]]);
      expect(computeAutoScale(data, 800)).toBeNull();
    });

    it('snaps up to the smallest step >= raw — 5000ms span / 800px → raw ≈ 6.25 → step 10', () => {
      // raw = 5000 / 800 = 6.25; ceiling: step 5 (5 < 6.25) is too zoomed-in → step 10
      const data = makeEntries([[0, 5000]]);
      expect(computeAutoScale(data, 800)).toBe(10);
    });

    it('snaps to step 10 when raw is close to 10', () => {
      // raw = 8000 / 800 = 10 → exactly step 10
      const data = makeEntries([[0, 8000]]);
      expect(computeAutoScale(data, 800)).toBe(10);
    });

    it('only considers the first requestCount (default 25) entries', () => {
      // First 25 entries span 5000ms; remaining entries span much more
      const first25 = Array.from({ length: 25 }, (_, i) => [i * 10, i * 10 + 100] as [number, number]);
      const rest = [[0, 500_000]] as [number, number][];
      const data = makeEntries([...first25, ...rest]);
      // span of first 25 = (24*10+100) - 0 = 340ms in 800px → raw ≈ 0.425 → snaps to 5
      expect(computeAutoScale(data, 800)).toBe(5);
    });

    it('respects a custom requestCount', () => {
      // Only first 1 entry: span = 500ms in 800px → raw ≈ 0.625 → snaps to 5
      const data = makeEntries([[0, 500], [0, 200_000]]);
      expect(computeAutoScale(data, 800, 1)).toBe(5);
    });

    it('clamps to the largest step for very long spans', () => {
      // raw = 1_000_000 / 800 = 1250 → exceeds all steps → clamped to 1000
      const data = makeEntries([[0, 1_000_000]]);
      expect(computeAutoScale(data, 800)).toBe(1000);
    });

    describe('collapse-idle aware (collapseIdlePeriods = true, the default)', () => {
      // Two clusters separated by a 10 s idle gap (> IDLE_GAP_THRESHOLD_MS = 5 000 ms).
      // The gap band consumes 28 px; request bars must fit the remaining budget.
      //   Request A: [0, 500]   → active window [0, 500]
      //   Gap:       500–10 500 → 10 000 ms → collapsed gap
      //   Request B: [10_500, 11_000] → active window [10_500, 11_000]
      //   spanMs = 11 000, collapsedGapMs = 10 000, activeMs = 1 000
      //   activePixelBudget = 800 - 28 = 772
      //   raw = 1 000 / 772 ≈ 1.29 → ceiling step = 5
      const gapData = makeEntries([[0, 500], [10_500, 11_000]]);

      it('subtracts collapsed gap bands from the pixel budget', () => {
        expect(computeAutoScale(gapData, 800)).toBe(5);
      });

      it('produces a different (smaller) scale than the linear path for gapped data', () => {
        // Linear path: spanMs = 11 000 / 800 px → raw ≈ 13.75 → ceiling step = 25
        const linearScale = computeAutoScale(gapData, 800, 25, false);
        // Compressed path: activeMs = 1 000, budget = 772 px → raw ≈ 1.29 → ceiling step = 5
        const compressedScale = computeAutoScale(gapData, 800, 25, true);
        // Compressed scale must be < linear scale (gaps hidden → more zoomed-in fits)
        expect(linearScale).toBe(25);
        expect(compressedScale).toBe(5);
        expect(compressedScale!).toBeLessThan(linearScale!);
      });

      it('ignores gaps shorter than IDLE_GAP_THRESHOLD_MS', () => {
        // Gap of 2 000 ms < 5 000 ms threshold — rendered proportionally, not collapsed.
        // spanMs = 2 400 (last endTime − minStart), collapsedGapMs = 0, activeMs = 2 400.
        // raw = 2 400 / 800 = 3 → ceiling step = 5
        const smallGapData = makeEntries([[0, 200], [2_200, 2_400]]);
        expect(computeAutoScale(smallGapData, 800, 25, true)).toBe(5);
      });
    });
  });
});
