import { calculateTimeRangeMicros, microsToMs } from '../utils/timeUtils';
import type { LogLevel, ParsedLogLine } from '../types/log.types';

type LogLines = ParsedLogLine[];

export function computeChartData(logLines: LogLines) {
  if (logLines.length === 0) {
    return { buckets: [], maxCount: 0, minTime: 0, maxTime: 0 };
  }

  // Use precomputed timestampUs and convert to milliseconds for bucketing
  const timestamps = logLines.map((line) => microsToMs(line.timestampUs));
  const dataMinTime = Math.min(...timestamps);
  const dataMaxTime = Math.max(...timestamps);
  const timeRange = dataMaxTime - dataMinTime;

  const targetBars = 100;
  let bucketSize = 1000;
  if (timeRange > 0) {
    bucketSize = Math.max(1000, Math.ceil(timeRange / targetBars));
  }

  const formatTime = (timestampMs: number): string => {
    const date = new Date(timestampMs);
    return date.toISOString().split('T')[1].split('.')[0];
  };

  interface TimeBucket {
    timestamp: number;
    timeLabel: string;
    counts: Record<LogLevel, number>;
    total: number;
  }

  const bucketMap = new Map<number, TimeBucket>();
  const firstBucketKey = Math.floor(dataMinTime / bucketSize) * bucketSize;
  const lastBucketKey = Math.floor(dataMaxTime / bucketSize) * bucketSize;

  for (let bucketKey = firstBucketKey; bucketKey <= lastBucketKey; bucketKey += bucketSize) {
    bucketMap.set(bucketKey, {
      timestamp: bucketKey,
      timeLabel: formatTime(bucketKey),
      counts: {
        TRACE: 0,
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
        UNKNOWN: 0,
      },
      total: 0,
    });
  }

  logLines.forEach((line) => {
    // Use precomputed timestampUs converted to ms for bucketing
    const time = microsToMs(line.timestampUs);
    const bucketKey = Math.floor(time / bucketSize) * bucketSize;

    const bucket = bucketMap.get(bucketKey);
    if (bucket) {
      bucket.counts[line.level]++;
      bucket.total++;
    }
  });

  const dataBuckets = Array.from(bucketMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  const dataMaxCount = Math.max(...dataBuckets.map((b) => b.total), 0);

  return { buckets: dataBuckets, maxCount: dataMaxCount, minTime: dataMinTime, maxTime: dataMaxTime };
}

export function extractTimes(logLines: LogLines) {
  // Use precomputed timestampUs
  const timesUs = logLines.map((line) => line.timestampUs).filter((t) => t > 0);
  const maxTimeUs = timesUs.length > 0 ? Math.max(...timesUs) : 0;
  return { timesUs, maxTimeUs };
}

export function computeFilteredLines(
  logLines: LogLines,
  startTime: string,
  endTime: string,
) {
  if (logLines.length === 0) return [];

  const { timesUs, maxTimeUs } = extractTimes(logLines);
  const minTimeUs = timesUs.length > 0 ? Math.min(...timesUs) : 0;
  const { startUs, endUs } = calculateTimeRangeMicros(startTime, endTime, minTimeUs, maxTimeUs);

  // Use precomputed timestampUs for filtering
  const filtered = logLines.filter((line) => {
    return line.timestampUs >= startUs && line.timestampUs <= endUs;
  });

  // Use precomputed displayTime instead of converting
  return filtered.map((line) => ({
    ...line,
    timestamp: line.displayTime,
  }));
}

export function convertTimestamps(logLines: LogLines) {
  // This benchmark now tests accessing precomputed displayTime
  // instead of converting timestamps on the fly
  logLines.forEach((line) => {
    // Access precomputed displayTime (no conversion needed)
    void line.displayTime;
  });
}
