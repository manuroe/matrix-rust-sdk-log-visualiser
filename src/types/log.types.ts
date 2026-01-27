export interface HttpRequest {
  request_id: string;
  request_time: string;
  response_time: string;
  method: string;
  uri: string;
  status: string;
  request_size: string;
  response_size: string;
  request_duration_ms: number | string;
  send_line: string;
  response_line: string;
}

export interface SyncRequest extends HttpRequest {
  conn_id: string;
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
