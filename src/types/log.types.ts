export interface HttpRequest {
  requestId: string;
  requestTime: string;
  responseTime: string;
  method: string;
  uri: string;
  status: string;
  requestSize: string;
  responseSize: string;
  requestDurationMs: number | string;
  sendLine: string;
  responseLine: string;
}

export interface SyncRequest extends HttpRequest {
  connId: string;
}

export interface LogParserResult {
  requests: SyncRequest[];
  connectionIds: string[];
  rawLogLines: ParsedLogLine[];
}

export interface ParsedLogLine {
  lineNumber: number;
  rawText: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'UNKNOWN';
