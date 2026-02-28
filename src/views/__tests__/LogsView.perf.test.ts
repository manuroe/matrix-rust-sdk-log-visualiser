/**
 * Performance benchmarks for LogsView.tsx
 * Measures time filtering and log line transformation performance.
 *
 * Run with: npm run bench
 *
 * NOTE: This tests the pure filtering logic (useMemo in LogsView),
 * not the React render cycle. Focuses on:
 * - Time extraction from timestamps
 * - Time range filtering
 * - Line transformation (timestamp conversion)
 */
import { describe, bench } from 'vitest';
import {
  generateLogLines,
  PERF_TEST_SCALES,
} from '../../test/performanceFixtures';
import {
  computeFilteredLines,
  extractTimes,
  convertTimestamps,
} from '../../test/benchmarkHelpers';

describe('LogsView Performance', () => {
  describe('Time range filtering', () => {
    const startTime = '10:00';
    const endTime = '11:00';

    bench('small (1K lines)', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      computeFilteredLines(logLines, startTime, endTime);
    });

    bench('medium (10K lines)', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      computeFilteredLines(logLines, startTime, endTime);
    });
  });

  describe('Time extraction only (time-critical path)', () => {
    bench('extract 1K times', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      extractTimes(logLines);
    });

    bench('extract 10K times', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      extractTimes(logLines);
    });
  });

  describe('Timestamp conversion (isoToTime)', () => {
    bench('convert 1K timestamps', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      convertTimestamps(logLines);
    });

    bench('convert 10K timestamps', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      convertTimestamps(logLines);
    });
  });

});
