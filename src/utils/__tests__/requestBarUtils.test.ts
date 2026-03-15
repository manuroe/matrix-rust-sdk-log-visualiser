import { describe, expect, it } from 'vitest';
import { buildAttemptSegments, buildRetryTooltip, computeHasSegments, getAttemptSegmentColor } from '../requestBarUtils';
import { INCOMPLETE_STATUS_KEY } from '../statusCodeUtils';

describe('getAttemptSegmentColor', () => {
  it('returns the HTTP status color for numeric outcome strings', () => {
    // 200 is a known code → specific CSS variable, not the category fallback
    const color = getAttemptSegmentColor('200');
    expect(color).toBe('var(--http-200)');
  });

  it('returns the incomplete color for INCOMPLETE_STATUS_KEY', () => {
    expect(getAttemptSegmentColor(INCOMPLETE_STATUS_KEY)).toBe('var(--http-incomplete)');
  });

  it('returns the client-error color for non-numeric, non-Incomplete outcomes', () => {
    expect(getAttemptSegmentColor('TimedOut')).toBe('var(--http-client-error)');
    expect(getAttemptSegmentColor('ConnectionRefused')).toBe('var(--http-client-error)');
  });
});

describe('buildAttemptSegments', () => {
  it('returns an empty array for zero totalMs', () => {
    expect(buildAttemptSegments(['200'], [0], 0, 100)).toEqual([]);
  });

  it('returns an empty array for negative totalMs', () => {
    expect(buildAttemptSegments(['200'], [0], -1, 100)).toEqual([]);
  });

  it('returns an empty array for empty outcomes', () => {
    expect(buildAttemptSegments([], [], 1000, 100)).toEqual([]);
  });

  it('returns an empty array when timestamps are fewer than outcomes', () => {
    expect(buildAttemptSegments(['503', '200'], [0], 1000, 100)).toEqual([]);
  });

  it('produces one segment occupying the full bar for a single outcome', () => {
    const segs = buildAttemptSegments(['200'], [0], 1000, 100);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ leftPx: 0, widthPx: 100 });
  });

  it('produces two proportional segments for two outcomes', () => {
    // seg 0 spans 250ms (25%), seg 1 spans 750ms (75%) of 1000ms
    const ts = [0, 250_000]; // µs
    const segs = buildAttemptSegments(['503', '200'], ts, 1000, 100);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ leftPx: 0, widthPx: 25 });
    expect(segs[1]).toMatchObject({ leftPx: 25, widthPx: 75 });
  });

  it('segment widths always sum exactly to barWidthPx', () => {
    // Irregular proportions to exercise remainder distribution
    const ts = [0, 333_333, 666_667]; // µs → ~33% / ~33% / ~33%
    const segs = buildAttemptSegments(['503', 'TimedOut', '200'], ts, 1000, 7);
    const total = segs.reduce((sum, s) => sum + s.widthPx, 0);
    expect(total).toBe(7);
  });

  /**
   * Regression test: with barWidthPx=2 and 4 equal-proportion segments,
   * Math.round(0.5) = 1 for each of the 3 non-last segments, causing usedPx to
   * accumulate to 3 > barWidthPx=2 without clamping. The fix clamps each
   * non-last segment to the remaining pixels so the sum invariant holds.
   */
  it('clamps non-last segments to prevent usedPx exceeding barWidthPx', () => {
    // 4 equal segments of 25% each, totalMs=4ms
    const ts = [0, 1_000, 2_000, 3_000]; // µs
    const segs = buildAttemptSegments(['503', '503', '503', '200'], ts, 4, 2);
    const total = segs.reduce((sum, s) => sum + s.widthPx, 0);
    expect(total).toBe(2);
    segs.forEach((s) => {
      expect(s.widthPx).toBeGreaterThanOrEqual(0);
    });
  });

  it('assigns correct leftPx offsets (cumulative sum of preceding widths)', () => {
    const ts = [0, 500_000]; // µs → 50/50 split
    const segs = buildAttemptSegments(['503', '200'], ts, 1000, 100);
    expect(segs[0].leftPx).toBe(0);
    expect(segs[1].leftPx).toBe(segs[0].widthPx);
  });

  it('assigns correct segment colors', () => {
    const ts = [0, 500_000];
    const segs = buildAttemptSegments(['TimedOut', '200'], ts, 1000, 100);
    expect(segs[0].color).toBe('var(--http-client-error)');
    expect(segs[1].color).toBe('var(--http-200)');
  });
});

describe('buildRetryTooltip', () => {
  it('formats a two-attempt tooltip correctly', () => {
    // ts0=0µs, ts1=120_000µs → seg0=120ms, seg1=1500ms (totalMs=1620)
    const ts = [0, 120_000];
    expect(buildRetryTooltip(['503', '200'], ts, 1620, 2)).toBe('↻2: 503 (120ms) → 200 (1500ms) — 1620ms');
  });

  it('formats a three-attempt tooltip correctly', () => {
    const ts = [0, 100_000, 300_000]; // 100ms, 200ms, 700ms (total 1000ms)
    expect(buildRetryTooltip(['503', 'TimedOut', '200'], ts, 1000, 3))
      .toBe('↻3: 503 (100ms) → TimedOut (200ms) → 200 (700ms) — 1000ms');
  });

  it('handles INCOMPLETE_STATUS_KEY outcome in tooltip', () => {
    const ts = [0, 0]; // zero-duration first segment
    const result = buildRetryTooltip([INCOMPLETE_STATUS_KEY, '200'], ts, 500, 2);
    expect(result).toContain(INCOMPLETE_STATUS_KEY);
  });
});

describe('computeHasSegments', () => {
  const base = {
    requestId: 'r1',
    method: 'GET',
    uri: '/test',
    status: '200 OK',
    requestDurationMs: 500,
    requestSize: 0,
    responseSize: 0,
    requestSizeString: '',
    responseSizeString: '',
    sendLineNumber: 1,
    responseLineNumber: 2,
  } as const;

  it('returns false for a single-attempt request', () => {
    expect(computeHasSegments({ ...base, numAttempts: 1 })).toBe(false);
  });

  it('returns false when numAttempts is undefined (defaults to 1)', () => {
    expect(computeHasSegments({ ...base })).toBe(false);
  });

  it('returns false when attemptOutcomes length does not match numAttempts', () => {
    expect(computeHasSegments({
      ...base,
      numAttempts: 2,
      attemptOutcomes: ['503'],
      attemptTimestampsUs: [0, 500_000],
    })).toBe(false);
  });

  it('returns false when attemptTimestampsUs length does not match numAttempts', () => {
    expect(computeHasSegments({
      ...base,
      numAttempts: 2,
      attemptOutcomes: ['503', '200'],
      attemptTimestampsUs: [0],
    })).toBe(false);
  });

  it('returns true when numAttempts > 1 and both arrays match length', () => {
    expect(computeHasSegments({
      ...base,
      numAttempts: 2,
      attemptOutcomes: ['503', '200'],
      attemptTimestampsUs: [0, 500_000],
    })).toBe(true);
  });
});
