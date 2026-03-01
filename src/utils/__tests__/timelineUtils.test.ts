import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MS_PER_PIXEL,
  msToMinPixels,
  calculateTimelineWidth,
  getWaterfallPosition,
  getWaterfallBarWidth,
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
});
