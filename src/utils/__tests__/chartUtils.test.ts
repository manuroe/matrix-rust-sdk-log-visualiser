/**
 * Unit tests for chartUtils.ts — pure coordinate math helpers.
 *
 * These tests are independent of SVG mocking or @visx/event wiring;
 * they validate the mathematical contract for coordinate↔time conversion
 * and edge-snapping logic.
 */
import { describe, it, expect } from 'vitest';
import { xToTime, snapToEdge } from '../chartUtils';
import type { TimestampMicros } from '../../types/time.types';

const MIN_TIME = 1_000_000 as TimestampMicros; // 1 second
const MAX_TIME = 11_000_000 as TimestampMicros; // 11 seconds (10s span)
const X_MAX = 1000; // 1000px wide chart

// ---------------------------------------------------------------------------
// xToTime
// ---------------------------------------------------------------------------

describe('xToTime', () => {
  it('returns minTime when x = 0', () => {
    expect(xToTime(0, X_MAX, MIN_TIME, MAX_TIME)).toBe(MIN_TIME);
  });

  it('returns maxTime when x = xMax', () => {
    expect(xToTime(X_MAX, X_MAX, MIN_TIME, MAX_TIME)).toBe(MAX_TIME);
  });

  it('returns midpoint at x = xMax / 2', () => {
    const mid = xToTime(500, X_MAX, MIN_TIME, MAX_TIME);
    expect(mid).toBe(6_000_000); // (1M + 11M) / 2
  });

  it('is linearly proportional', () => {
    const at25pct = xToTime(250, X_MAX, MIN_TIME, MAX_TIME);
    const at75pct = xToTime(750, X_MAX, MIN_TIME, MAX_TIME);
    // Each 250px step covers 25% of a 10s span = 2.5s = 2_500_000µs
    expect(at25pct).toBe(MIN_TIME + 0.25 * 10_000_000); // 3_500_000
    expect(at75pct).toBe(MIN_TIME + 0.75 * 10_000_000); // 8_500_000
  });

  it('returns minTime when xMax = 0 (degenerate chart)', () => {
    // Division by zero guard
    expect(xToTime(500, 0, MIN_TIME, MAX_TIME)).toBe(MIN_TIME);
  });

  it('handles zero-duration range (minTime === maxTime)', () => {
    const sameTime = 5_000_000 as TimestampMicros;
    // Both edges map to the same time — any x returns that time
    expect(xToTime(0, X_MAX, sameTime, sameTime)).toBe(sameTime);
    expect(xToTime(500, X_MAX, sameTime, sameTime)).toBe(sameTime);
  });
});

// ---------------------------------------------------------------------------
// snapToEdge
// ---------------------------------------------------------------------------

describe('snapToEdge', () => {
  // bucket = 500_000 µs (0.5 s)
  const BUCKET = 500_000;

  it('does not snap when both boundaries are well inside the range', () => {
    const rawStart = (MIN_TIME + 2_000_000) as TimestampMicros; // 2s in from left edge
    const rawEnd = (MAX_TIME - 2_000_000) as TimestampMicros; // 2s in from right edge

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, BUCKET);
    expect(start).toBe(rawStart);
    expect(end).toBe(rawEnd);
  });

  it('snaps start to minTime when within one bucket of left edge', () => {
    // rawStart is 300_000µs from minTime, which is < BUCKET (500_000)
    const rawStart = (MIN_TIME + 300_000) as TimestampMicros;
    const rawEnd = (MAX_TIME - 2_000_000) as TimestampMicros;

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, BUCKET);
    expect(start).toBe(MIN_TIME);
    expect(end).toBe(rawEnd); // right boundary unchanged
  });

  it('snaps end to maxTime when within one bucket of right edge', () => {
    const rawStart = (MIN_TIME + 2_000_000) as TimestampMicros;
    // rawEnd is 300_000µs before maxTime
    const rawEnd = (MAX_TIME - 300_000) as TimestampMicros;

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, BUCKET);
    expect(start).toBe(rawStart); // left boundary unchanged
    expect(end).toBe(MAX_TIME);
  });

  it('snaps both edges when both are within one bucket of their respective bounds', () => {
    const rawStart = (MIN_TIME + 100_000) as TimestampMicros;
    const rawEnd = (MAX_TIME - 100_000) as TimestampMicros;

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, BUCKET);
    expect(start).toBe(MIN_TIME);
    expect(end).toBe(MAX_TIME);
  });

  it('exactly at the bucket boundary does not snap', () => {
    // rawStart is exactly bucketTimeSpan away — not less than, so no snap
    const rawStart = (MIN_TIME + BUCKET) as TimestampMicros;
    const rawEnd = (MAX_TIME - BUCKET) as TimestampMicros;

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, BUCKET);
    expect(start).toBe(rawStart);
    expect(end).toBe(rawEnd);
  });

  it('handles zero bucketTimeSpan (no snapping)', () => {
    const rawStart = (MIN_TIME + 1) as TimestampMicros;
    const rawEnd = (MAX_TIME - 1) as TimestampMicros;

    const [start, end] = snapToEdge(rawStart, rawEnd, MIN_TIME, MAX_TIME, 0);
    expect(start).toBe(rawStart);
    expect(end).toBe(rawEnd);
  });
});
