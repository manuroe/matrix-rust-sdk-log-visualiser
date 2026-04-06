/**
 * Performance benchmarks for waterfallGapUtils.ts
 * Measures timeline construction and lookup performance at realistic HTTP
 * request scales (500 / 2 000 / 5 000 rows).
 *
 * Run with: npm run bench
 *
 * NOTE: This covers the JS computation side only — the scroll-paint regression
 * caused by the gap overlay divs (repaint on every scroll event) is validated
 * manually in the browser.  These benchmarks establish a baseline so that the
 * CSS fix (`will-change: transform` on `.gapOverlay`) can be confirmed not to
 * have introduced any JS-side regressions.
 *
 * Two scenarios are exercised for each scale:
 *  - Dense  – requests spaced 1 s apart, no gaps exceed the 5 s threshold.
 *             Validates the baseline (linear) path through `buildCompressedTimeline`.
 *  - Sparse – requests grouped in 10-row bursts separated by 30 s idle periods.
 *             Triggers gap compression and exercises the binary-search lookup paths.
 */
import { describe, bench } from 'vitest';
import {
  buildCompressedTimeline,
  buildLinearTimeline,
} from '../waterfallGapUtils';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const MS_PER_PIXEL = 10;
const BASE_TIME_MS = 1_700_000_000_000; // arbitrary epoch anchor

/**
 * Generate a dense `timeData` array where every request starts 1 s after the
 * previous one ends (spacing well below the 5 s gap threshold).
 *
 * @example generateDenseTimeData(2000) → 2000 entries, 1 s apart
 */
function generateDenseTimeData(count: number): { startTime: number; endTime: number }[] {
  const DURATION_MS = 300;
  const SPACING_MS = 1_000; // 1 s — below IDLE_GAP_THRESHOLD_MS (5 s)
  const data: { startTime: number; endTime: number }[] = [];
  let cursor = BASE_TIME_MS;
  for (let i = 0; i < count; i++) {
    data.push({ startTime: cursor, endTime: cursor + DURATION_MS });
    cursor += SPACING_MS;
  }
  return data;
}

/**
 * Generate a sparse `timeData` array where requests arrive in bursts of 10,
 * with a 30 s idle gap between bursts (well above the 5 s threshold).
 * This is the scenario that activates gap compression.
 *
 * @example generateSparseTimeData(2000) → 200 bursts × 10 requests, 30 s gaps
 */
function generateSparseTimeData(count: number): { startTime: number; endTime: number }[] {
  const DURATION_MS = 300;
  const BURST_SIZE = 10;
  const WITHIN_BURST_SPACING_MS = 500; // 0.5 s — below threshold
  const GAP_BETWEEN_BURSTS_MS = 30_000; // 30 s — well above IDLE_GAP_THRESHOLD_MS (5 s)
  const data: { startTime: number; endTime: number }[] = [];
  let cursor = BASE_TIME_MS;
  for (let i = 0; i < count; i++) {
    data.push({ startTime: cursor, endTime: cursor + DURATION_MS });
    const isLastInBurst = (i + 1) % BURST_SIZE === 0;
    cursor += isLastInBurst ? GAP_BETWEEN_BURSTS_MS : WITHIN_BURST_SPACING_MS;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Pre-computed fixtures for lookup benchmarks (build once, look up many times)
// ---------------------------------------------------------------------------

// Build compressed timelines upfront so lookup benchmarks don't include build cost.
const SPARSE_2K = generateSparseTimeData(2_000);
const SPARSE_5K = generateSparseTimeData(5_000);
const DENSE_2K = generateDenseTimeData(2_000);
const DENSE_5K = generateDenseTimeData(5_000);

const minTime2kSparse = SPARSE_2K[0].startTime;
const maxTime2kSparse = SPARSE_2K[SPARSE_2K.length - 1].endTime;
const timeline2kSparse = buildCompressedTimeline(SPARSE_2K, minTime2kSparse, maxTime2kSparse, MS_PER_PIXEL);

const minTime5kSparse = SPARSE_5K[0].startTime;
const maxTime5kSparse = SPARSE_5K[SPARSE_5K.length - 1].endTime;
const timeline5kSparse = buildCompressedTimeline(SPARSE_5K, minTime5kSparse, maxTime5kSparse, MS_PER_PIXEL);

// ---------------------------------------------------------------------------
// Benchmarks: buildCompressedTimeline (Dense — no gaps)
// ---------------------------------------------------------------------------

describe('buildCompressedTimeline — dense (no gap compression)', () => {
  bench('build: 500 requests, dense', () => {
    const data = generateDenseTimeData(500);
    const minTime = data[0].startTime;
    const maxTime = data[data.length - 1].endTime;
    buildCompressedTimeline(data, minTime, maxTime, MS_PER_PIXEL);
  });

  bench('build: 2 000 requests, dense', () => {
    const minTime = DENSE_2K[0].startTime;
    const maxTime = DENSE_2K[DENSE_2K.length - 1].endTime;
    buildCompressedTimeline(DENSE_2K, minTime, maxTime, MS_PER_PIXEL);
  });

  bench('build: 5 000 requests, dense', () => {
    const minTime = DENSE_5K[0].startTime;
    const maxTime = DENSE_5K[DENSE_5K.length - 1].endTime;
    buildCompressedTimeline(DENSE_5K, minTime, maxTime, MS_PER_PIXEL);
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: buildCompressedTimeline (Sparse — gap compression active)
// ---------------------------------------------------------------------------

describe('buildCompressedTimeline — sparse (gap compression active)', () => {
  bench('build: 500 requests, sparse', () => {
    const data = generateSparseTimeData(500);
    const minTime = data[0].startTime;
    const maxTime = data[data.length - 1].endTime;
    buildCompressedTimeline(data, minTime, maxTime, MS_PER_PIXEL);
  });

  bench('build: 2 000 requests, sparse', () => {
    buildCompressedTimeline(SPARSE_2K, minTime2kSparse, maxTime2kSparse, MS_PER_PIXEL);
  });

  bench('build: 5 000 requests, sparse', () => {
    buildCompressedTimeline(SPARSE_5K, minTime5kSparse, maxTime5kSparse, MS_PER_PIXEL);
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: timeToPixel (binary-search lookup, called once per rendered row)
// ---------------------------------------------------------------------------

describe('timeToPixel — lookup (sparse timeline, called per row during render)', () => {
  bench('timeToPixel: 2 000-request sparse timeline, 2 000 lookups', () => {
    for (let i = 0; i < SPARSE_2K.length; i++) {
      timeline2kSparse.timeToPixel(SPARSE_2K[i].startTime);
    }
  });

  bench('timeToPixel: 5 000-request sparse timeline, 5 000 lookups', () => {
    for (let i = 0; i < SPARSE_5K.length; i++) {
      timeline5kSparse.timeToPixel(SPARSE_5K[i].startTime);
    }
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: durationToPixels (called once per rendered row)
// ---------------------------------------------------------------------------

describe('durationToPixels — lookup (sparse timeline, called per row during render)', () => {
  bench('durationToPixels: 2 000-request sparse timeline, 2 000 lookups', () => {
    for (let i = 0; i < SPARSE_2K.length; i++) {
      timeline2kSparse.durationToPixels(SPARSE_2K[i].startTime, SPARSE_2K[i].endTime);
    }
  });

  bench('durationToPixels: 5 000-request sparse timeline, 5 000 lookups', () => {
    for (let i = 0; i < SPARSE_5K.length; i++) {
      timeline5kSparse.durationToPixels(SPARSE_5K[i].startTime, SPARSE_5K[i].endTime);
    }
  });
});

// ---------------------------------------------------------------------------
// Benchmarks: buildLinearTimeline (comparison baseline — "Collapse idle" off)
// ---------------------------------------------------------------------------

describe('buildLinearTimeline — baseline (collapse idle disabled)', () => {
  bench('build: 2 000-request equivalent, linear', () => {
    const totalDurationMs = 2_000 * 1_000; // 2000 requests × 1 s spacing
    buildLinearTimeline(BASE_TIME_MS, totalDurationMs, totalDurationMs / MS_PER_PIXEL, MS_PER_PIXEL);
  });

  bench('build: 5 000-request equivalent, linear', () => {
    const totalDurationMs = 5_000 * 1_000;
    buildLinearTimeline(BASE_TIME_MS, totalDurationMs, totalDurationMs / MS_PER_PIXEL, MS_PER_PIXEL);
  });
});


