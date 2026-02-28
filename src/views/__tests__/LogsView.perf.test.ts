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

    bench('LogsView: time range filtering 1K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      computeFilteredLines(logLines, startTime, endTime);
    });

    bench('LogsView: time range filtering 10K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      computeFilteredLines(logLines, startTime, endTime);
    });
  });

  describe('Time extraction only (time-critical path)', () => {
    bench('LogsView: time extraction 1K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      extractTimes(logLines);
    });

    bench('LogsView: time extraction 10K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      extractTimes(logLines);
    });
  });

  describe('Timestamp conversion (isoToTime)', () => {
    bench('LogsView: timestamp conversion 1K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      convertTimestamps(logLines);
    });

    bench('LogsView: timestamp conversion 10K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      convertTimestamps(logLines);
    });
  });

});
