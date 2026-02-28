/**
 * Performance benchmarks for LogActivityChart.tsx
 * Measures render time and data aggregation performance across different log sizes.
 *
 * Run with: npm run bench
 *
 * NOTE: This tests the pure computation (bucket aggregation, time formatting),
 * not the React render cycle with DOM manipulation. See LogActivityChart.render.perf.test.ts
 * for full end-to-end render benchmarks.
 */
import { describe, bench } from 'vitest';
import {
  generateLogLines,
  PERF_TEST_SCALES,
} from '../../test/performanceFixtures';
import { computeChartData, extractTimes } from '../../test/benchmarkHelpers';

describe('LogActivityChart Performance', () => {
  describe('Data aggregation (chartData useMemo)', () => {
    bench('LogActivityChart: chart data aggregation 1K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      computeChartData(logLines);
    });

    bench('LogActivityChart: chart data aggregation 10K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      computeChartData(logLines);
    });
  });

  describe('Time extraction (timeToMs calls)', () => {
    bench('LogActivityChart: time extraction 1K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.small);
      extractTimes(logLines);
    });

    bench('LogActivityChart: time extraction 10K lines', () => {
      const logLines = generateLogLines(PERF_TEST_SCALES.medium);
      extractTimes(logLines);
    });
  });
});
