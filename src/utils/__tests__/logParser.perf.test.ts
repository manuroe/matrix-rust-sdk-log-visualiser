/**
 * Performance benchmarks for logParser.ts
 * Measures parse time across different log file sizes.
 *
 * Run with: npm run bench
 */
import { describe, bench } from 'vitest';
import { parseAllHttpRequests, parseLogFile } from '../logParser';
import {
  generateLogContent,
  PERF_TEST_SCALES,
} from '../../test/performanceFixtures';

describe('logParser Performance', () => {
  describe('parseAllHttpRequests', () => {
    bench('small (1K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.small, 10);
      parseAllHttpRequests(content);
    });

    bench('medium (10K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.medium, 100);
      parseAllHttpRequests(content);
    });

    bench('large (100K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.large, 500);
      parseAllHttpRequests(content);
    });

    // Optional: uncomment to test 1M line parsing (may be slow)
    // bench('very large (1M lines)', () => {
    //   const content = generateLogContent(PERF_TEST_SCALES.veryLarge, 2000);
    //   parseAllHttpRequests(content);
    // });
  });

  describe('parseLogFile', () => {
    bench('small (1K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.small, 10);
      parseLogFile(content);
    });

    bench('medium (10K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.medium, 100);
      parseLogFile(content);
    });

    bench('large (100K lines)', () => {
      const content = generateLogContent(PERF_TEST_SCALES.large, 500);
      parseLogFile(content);
    });
  });

});
