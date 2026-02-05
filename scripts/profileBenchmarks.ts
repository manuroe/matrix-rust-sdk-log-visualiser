#!/usr/bin/env node

/**
 * Memory profiling post-processor for benchmarks.
 *
 * Runs after Vitest benchmarks complete to:
 * 1. Read the generated benchmark/report.json
 * 2. Re-run benchmark operations with memory profiling
 * 3. Merge memory data back into the JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateLogContent,
  generateLogLines,
  profileMemoryUsage,
} from '../src/test/performanceFixtures';
import {
  computeChartData,
  computeFilteredLines,
  extractTimes,
  convertTimestamps,
} from '../src/test/benchmarkHelpers';
import { parseAllHttpRequests, parseLogFile } from '../src/utils/logParser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const benchmarksFile = process.argv[2];

function parseScaleValue(label: string) {
  const match = label.match(/(\d+)K/i);
  return match ? Number(match[1]) * 1000 : null;
}

function profileMemoryForGroup(groupName: string, benchName: string): number | null {
  if (groupName.includes('logParser Performance > parseAllHttpRequests')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const content = generateLogContent(scale, Math.max(10, Math.floor(scale / 100)));
    return profileMemoryUsage(() => parseAllHttpRequests(content)).heapUsedDelta;
  }

  if (groupName.includes('logParser Performance > parseLogFile')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const content = generateLogContent(scale, Math.max(10, Math.floor(scale / 100)));
    return profileMemoryUsage(() => parseLogFile(content)).heapUsedDelta;
  }

  if (groupName.includes('LogActivityChart Performance > Data aggregation')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const lines = generateLogLines(scale);
    return profileMemoryUsage(() => computeChartData(lines)).heapUsedDelta;
  }

  if (groupName.includes('LogActivityChart Performance > Time extraction')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const lines = generateLogLines(scale);
    return profileMemoryUsage(() => extractTimes(lines)).heapUsedDelta;
  }

  if (groupName.includes('LogsView Performance > Time range filtering')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const lines = generateLogLines(scale);
    return profileMemoryUsage(() => computeFilteredLines(lines, '10:00', '11:00')).heapUsedDelta;
  }

  if (groupName.includes('LogsView Performance > Time extraction only')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const lines = generateLogLines(scale);
    return profileMemoryUsage(() => extractTimes(lines)).heapUsedDelta;
  }

  if (groupName.includes('LogsView Performance > Timestamp conversion')) {
    const scale = parseScaleValue(benchName);
    if (!scale) return null;
    const lines = generateLogLines(scale);
    return profileMemoryUsage(() => convertTimestamps(lines)).heapUsedDelta;
  }

  return null;
}

function normalizeGroupName(fullName: string) {
  const parts = fullName.split(' > ');
  return parts.length > 1 ? parts.slice(1).join(' > ') : fullName;
}

try {
  if (!fs.existsSync(benchmarksFile)) {
    console.error('❌ benchmark/report.json not found. Run `npm run bench` first.');
    process.exit(1);
  }

  const benchmarks = JSON.parse(fs.readFileSync(benchmarksFile, 'utf-8'));

  for (const file of benchmarks.files || []) {
    for (const group of file.groups || []) {
      const groupName = normalizeGroupName(group.fullName || file.filepath || '');

      for (const bench of group.benchmarks || []) {
        const memoryMb = profileMemoryForGroup(groupName, bench.name);
        if (memoryMb != null) {
          bench.memory_mb = Number(memoryMb.toFixed(2));
        }
      }
    }
  }

  fs.writeFileSync(benchmarksFile, JSON.stringify(benchmarks, null, 2) + '\n');
  console.log(`✅ Memory data added to ${benchmarksFile}`);
} catch (error) {
  console.error('❌ Error profiling benchmarks:', error instanceof Error ? error.message : error);
  process.exit(1);
}
