import { calculateTimeRange, isoToTime, timeToMs } from '../utils/timeUtils';
import type { LogLevel, ParsedLogLine } from '../types/log.types';

type LogLines = ParsedLogLine[];

export function computeChartData(logLines: LogLines) {
  if (logLines.length === 0) {
    return { buckets: [], maxCount: 0, minTime: 0, maxTime: 0 };
  }

  const timestamps = logLines.map((line) => timeToMs(line.timestamp));
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
    const time = timeToMs(line.timestamp);
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
  const times = logLines
    .map((line) => line.timestamp)
    .filter((t) => t)
    .map((t) => timeToMs(t));
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  return { times, maxTime };
}

export function computeFilteredLines(
  logLines: LogLines,
  startTime: string,
  endTime: string,
) {
  if (logLines.length === 0) return [];

  const { times, maxTime } = extractTimes(logLines);
  const { startMs, endMs } = calculateTimeRange(startTime, endTime, maxTime);

  const filtered = logLines.filter((line) => {
    const lineTimeMs = timeToMs(line.timestamp);
    return lineTimeMs >= startMs && lineTimeMs <= endMs;
  });

  return filtered.map((line) => ({
    ...line,
    timestamp: isoToTime(line.timestamp),
  }));
}

export function convertTimestamps(logLines: LogLines) {
  logLines.forEach((line) => {
    isoToTime(line.timestamp);
  });
}
