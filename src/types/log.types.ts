export interface HttpRequest {
  requestId: string;
  method: string;
  uri: string;
  status: string;
  requestSize: string;
  responseSize: string;
  requestDurationMs: number;
  sendLineNumber: number;
  responseLineNumber: number;
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
  timestampMs: number;
  displayTime: string;
  level: LogLevel;
  message: string;
  strippedMessage: string;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'UNKNOWN';
