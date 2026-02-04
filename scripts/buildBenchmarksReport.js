#!/usr/bin/env node

/**
 * Benchmark Report Builder
 *
 * Builds a markdown report from benchmark JSON files.
 *
 * Usage:
 *   node scripts/buildBenchmarksReport.js report.json \
 *     --baseline benchmark/baseline.json \
 *     --output benchmark/baseline.md
 *
 * Notes:
 * - --baseline is optional (no comparison if omitted or missing)
 * - --output is optional (prints to stdout when omitted)
 */

import fs from 'fs';
import path from 'path';

const regressionThreshold = 0.10; // 10% regression is highlighted in report

const args = process.argv.slice(2);
const currentFile = args[0];

function getFlagValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

const baselineFile = getFlagValue('--baseline');
const outputFile = getFlagValue('--output');

if (!currentFile) {
  console.error('❌ Missing report.json path');
  console.error('   Usage: buildBenchmarksReport.js report.json [--baseline path] [--output path]');
  process.exit(1);
}

if (!fs.existsSync(currentFile)) {
  console.error('❌ Current benchmarks not found');
  console.error(`   Missing: ${currentFile}`);
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(currentFile, 'utf8'));
const baseline = baselineFile && fs.existsSync(baselineFile)
  ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
  : null;

function normalizeGroupName(fullName) {
  if (!fullName) return 'unknown-group';
  const parts = fullName.split(' > ');
  if (parts.length <= 1) return fullName;
  return parts.slice(1).join(' > ');
}

function extractScaleValue(scaleStr) {
  const match = scaleStr.match(/(\d+)K/i);
  return match ? parseInt(match[1]) * 1000 : null;
}

function extractBenchmarkEntries(data) {
  if (Array.isArray(data?.files)) {
    const entries = [];
    for (const file of data.files) {
      for (const group of file.groups || []) {
        const normalizedGroup = normalizeGroupName(group.fullName || file.filepath);
        if (normalizedGroup.includes('Baseline Memory Snapshots')) continue;

        const isMemoryGroup = normalizedGroup.includes('Memory Usage - ');
        const testName = isMemoryGroup
          ? normalizedGroup.replace('Memory Usage - ', '')
          : normalizedGroup;

        for (const bench of group.benchmarks || []) {
          const scale = (bench.name || 'unknown').replace(' - memory', '').trim();
          entries.push({
            testName,
            scale,
            metricType: isMemoryGroup ? 'memory' : 'time',
            value: typeof bench.mean === 'number' ? bench.mean : 0,
            memoryValue: typeof bench.memory_mb === 'number' ? bench.memory_mb : null,
          });
        }
      }
    }
    return entries;
  }

  if (data?.benchmarks) {
    return Object.entries(data.benchmarks).map(([name, metric]) => ({
      testName: name,
      scale: 'default',
      metricType: 'time',
      value: metric.time_ms ?? 0,
      memoryValue: metric.memory_mb ?? 0,
    }));
  }

  return [];
}

function buildTableMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.testName)) map.set(entry.testName, new Map());
    const scales = map.get(entry.testName);
    if (!scales.has(entry.scale)) scales.set(entry.scale, { time: null, memory: null });
    const row = scales.get(entry.scale);
    if (entry.metricType === 'memory') {
      row.memory = entry.value;
    } else {
      row.time = entry.value;
      if (entry.memoryValue != null) row.memory = entry.memoryValue;
    }
  }
  return map;
}

function formatMetric(currentValue, baselineValue) {
  if (currentValue == null && baselineValue == null) return '—';
  if (currentValue == null) return '—';
  if (baselineValue == null || baselineValue === 0) {
    return `${currentValue.toFixed(2)}ms`;
  }
  const diff = currentValue - baselineValue;
  const pctChange = (diff / baselineValue) * 100;
  const prefix = pctChange > 0 ? '+' : '';
  return `${currentValue.toFixed(2)}ms (${prefix}${pctChange.toFixed(1)}%)`;
}

const reportLines = [];
const baselineLabel = baseline?.timestamp || 'none';

reportLines.push('### Performance Comparison');
reportLines.push('');
reportLines.push(`**Baseline**: ${baselineLabel}`);
reportLines.push(`**Threshold**: ${(regressionThreshold * 100).toFixed(0)}% regression`);
reportLines.push('');

const currentEntries = extractBenchmarkEntries(current);
const baselineEntries = baseline ? extractBenchmarkEntries(baseline) : [];
const currentMap = buildTableMap(currentEntries);
const baselineMap = buildTableMap(baselineEntries);

if (currentMap.size === 0) {
  console.error('❌ No benchmarks found in current results');
  process.exit(1);
}

const sortedTests = Array.from(currentMap.keys()).sort((a, b) => a.localeCompare(b));

for (const testName of sortedTests) {
  reportLines.push(`#### ${testName}`);
  reportLines.push('');
  reportLines.push(`| ${testName} | Scaling | Time (ms) | Memory (MB) |`);
  reportLines.push('| --- | --- | --- | --- |');

  const currentScales = currentMap.get(testName);
  const baselineScales = baselineMap.get(testName);
  const sortedScales = Array.from(currentScales.keys())
    .sort((a, b) => {
      const aVal = extractScaleValue(a) || 0;
      const bVal = extractScaleValue(b) || 0;
      return aVal - bVal || a.localeCompare(b);
    });

  const smallestTime = sortedScales
    .map(s => currentScales.get(s)?.time)
    .filter(t => t != null)
    .sort((a, b) => a - b)[0];

  for (const scale of sortedScales) {
    const currentRow = currentScales.get(scale) || { time: null, memory: null };
    const baselineRow = baselineScales?.get(scale) || { time: null, memory: null };

    const timeDisplay = formatMetric(currentRow.time, baselineRow.time);
    const memoryDisplay = currentRow.memory != null
      ? baselineRow.memory != null && baselineRow.memory > 0
        ? `${currentRow.memory.toFixed(2)}MB (${(((currentRow.memory - baselineRow.memory) / baselineRow.memory) * 100).toFixed(1)}%)`
        : `${currentRow.memory.toFixed(2)}MB`
      : '—';
    const scalingDisplay = currentRow.time != null && smallestTime != null && smallestTime > 0
      ? `${(currentRow.time / smallestTime).toFixed(1)}x`
      : '—';

    reportLines.push(`| ${scale} | ${scalingDisplay} | ${timeDisplay} | ${memoryDisplay} |`);
  }

  reportLines.push('');
}

reportLines.push('');
reportLines.push('✅ **Report generated**');

const report = reportLines.join('\n');

if (outputFile) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, report + '\n');
} else {
  console.log(report);
}
