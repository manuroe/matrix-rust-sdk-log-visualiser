import type { TimestampMicros, ISODateTimeString } from './time.types';

export interface HttpRequest {
  requestId: string;
  method: string;
  uri: string;
  status: string;
  requestSizeString: string;
  responseSizeString: string;
  requestSize: number;
  responseSize: number;
  requestDurationMs: number;
  sendLineNumber: number;
  responseLineNumber: number;
  /** Client-side transport error (e.g., "TimedOut", "Connect") when the request failed without receiving an HTTP response */
  clientError?: string;
  /**
   * Total number of send attempts made for this request (1 = no retry).
   * Populated from the `num_attempt=N` field logged by the SDK on each "Sending request" line.
   * Defaults to 1 when the field is absent (older SDK versions or single-attempt requests).
   */
  numAttempts?: number;
  /**
   * Microsecond timestamps for each attempt's send line, in attempt order.
   * Index 0 = first attempt (same time as `sendLineNumber`), index N-1 = last attempt.
   * Used to compute per-attempt segment widths inside the waterfall bar.
   */
  attemptTimestampsUs?: readonly TimestampMicros[];
  /**
   * Per-attempt outcome strings, one per attempt, in attempt order.
   * Each entry is either an HTTP status code (e.g. `'503'`) or a client error
   * name (e.g. `'TimedOut'`). Only present when intermediate responses are
   * available in the log (i.e. the SDK emitted a response/error span between
   * retries). Length equals `numAttempts` when fully resolved.
   */
  attemptOutcomes?: readonly string[];
}

export interface SyncRequest extends HttpRequest {
  connId: string;
  timeout?: number;
}

/**
 * An HTTP request enriched with its resolved timestamp in microseconds.
 * Stored in {@link SummaryStats.httpRequestsWithTimestamps} and consumed by
 * `HttpActivityChart` to plot request density over time.
 */
export interface HttpRequestWithTimestamp {
  readonly requestId: string;
  readonly status: string;
  readonly timestampUs: TimestampMicros;
  /** Timeout in ms when this is a /sync request; 0 = catch-up, ≥30000 = long-poll. */
  readonly timeout?: number;
}

export interface SentryEvent {
  platform: 'android' | 'ios';
  lineNumber: number;
  message: string;
  /** Hex crash ID, present for iOS crash reports only */
  sentryId?: string;
  /** Direct link to the Sentry issue, present for iOS crash reports only */
  sentryUrl?: string;
}

export interface LogParserResult {
  requests: SyncRequest[];
  httpRequests: HttpRequest[];
  connectionIds: string[];
  rawLogLines: ParsedLogLine[];
  sentryEvents: SentryEvent[];
}

/**
 * A parsed log line with extracted timestamp and metadata.
 * 
 * Timestamps are stored as:
 * - `isoTimestamp`: Original ISO 8601 string from the log
 * - `timestampUs`: Microseconds since epoch (for calculations)
 * - `displayTime`: Time-only string for display (HH:MM:SS.ssssss)
 */
export interface ParsedLogLine {
  lineNumber: number;
  rawText: string;
  /** Original ISO 8601 timestamp from log (e.g., "2026-01-26T16:01:13.382222Z") */
  isoTimestamp: ISODateTimeString;
  /** Microseconds since Unix epoch - for time calculations */
  timestampUs: TimestampMicros;
  /** Pre-formatted time for display (HH:MM:SS.ssssss) */
  displayTime: string;
  level: LogLevel;
  message: string;
  strippedMessage: string;
  /** Source file path extracted from log (e.g., "ClientProxy.swift" or "crates/matrix-sdk/src/http_client/native.rs") */
  filePath?: string;
  /** Source file line number extracted from log */
  sourceLineNumber?: number;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'UNKNOWN';
