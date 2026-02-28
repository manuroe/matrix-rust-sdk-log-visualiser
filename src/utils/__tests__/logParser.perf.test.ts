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
    bench('logParser: parseAllHttpRequests 1K lines', () => {
      const content = generateLogContent(PERF_TEST_SCALES.small, 10);
      parseAllHttpRequests(content);
    });

    bench('logParser: parseAllHttpRequests 10K lines', () => {
      const content = generateLogContent(PERF_TEST_SCALES.medium, 100);
      parseAllHttpRequests(content);
    });
  });

  describe('parseLogFile', () => {
    bench('logParser: parseLogFile 1K lines', () => {
      const content = generateLogContent(PERF_TEST_SCALES.small, 10);
      parseLogFile(content);
    });

    bench('logParser: parseLogFile 10K lines', () => {
      const content = generateLogContent(PERF_TEST_SCALES.medium, 100);
      parseLogFile(content);
    });
  });

});
