import type { HttpRequest, SyncRequest, LogParserResult, ParsedLogLine, LogLevel } from '../types/log.types';

// Regex patterns for parsing HTTP requests - generic (all URIs)
const HTTP_RESP_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+)"\s+request_size="(?<req_size>[^"]+)"\s+status=(?<status>\S+)\s+response_size="(?<resp_size>[^"]+)"\s+request_duration=(?<duration_val>[0-9.]+)(?<duration_unit>ms|s)/;
const HTTP_SEND_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+)"\s+request_size="(?<req_size>[^"]+)"(?![^}]*(?:status=|response_size=|request_duration=))/;

// Pattern for extracting log level - matches common Rust log formats
const LOG_LEVEL_RE = /\s(TRACE|DEBUG|INFO|WARN|ERROR)\s/;

function extractLogLevel(line: string): LogLevel {
  const match = line.match(LOG_LEVEL_RE);
  return match ? (match[1] as LogLevel) : 'UNKNOWN';
}

function extractTimestamp(line: string): string {
  // Extract timestamp from position 11+, format: HH:MM:SS.microseconds
  const timeMatch = line.slice(11).match(/(\d{2}:\d{2}:\d{2}\.\d+)Z?/);
  return timeMatch ? timeMatch[1] : '';
}

export interface AllHttpRequestsResult {
  httpRequests: HttpRequest[];
  rawLogLines: ParsedLogLine[];
}

export function parseAllHttpRequests(logContent: string): AllHttpRequestsResult {
  const lines = logContent.split('\n');
  const records = new Map<string, Partial<HttpRequest>>();
  const rawLogLines: ParsedLogLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse every line for the raw log view
    if (line.trim()) {
      const timestamp = extractTimestamp(line);
      const level = extractLogLevel(line);
      rawLogLines.push({
        lineNumber: i + 1,
        rawText: line,
        timestamp,
        level,
        message: line,
      });
    }

    // Early filter for performance - look for HTTP request patterns
    if (!line.includes('request_id=') || !line.includes('send{')) {
      continue;
    }

    // Extract timestamp
    const timeStr = extractTimestamp(line);

    // Try to match response pattern first
    const respMatch = line.match(HTTP_RESP_RE);
    if (respMatch && respMatch.groups) {
      const requestId = respMatch.groups.id;
      const durationVal = parseFloat(respMatch.groups.duration_val);
      const durationUnit = respMatch.groups.duration_unit;
      const durationMs = Math.round(durationVal * (durationUnit === 's' ? 1000.0 : 1.0));

      if (!records.has(requestId)) {
        records.set(requestId, {});
      }

      const rec = records.get(requestId)!;
      rec.request_id = requestId;
      rec.response_time = rec.response_time || timeStr || '';
      rec.method = rec.method || respMatch.groups.method;
      rec.uri = rec.uri || respMatch.groups.uri;
      rec.status = rec.status || respMatch.groups.status;
      rec.response_size = rec.response_size || respMatch.groups.resp_size;
      rec.request_size = rec.request_size || respMatch.groups.req_size;
      rec.request_duration_ms = rec.request_duration_ms || durationMs;
      rec.response_line = line;
      continue;
    }

    // Try to match send pattern
    const sendMatch = line.match(HTTP_SEND_RE);
    if (sendMatch && sendMatch.groups) {
      const requestId = sendMatch.groups.id;

      if (!records.has(requestId)) {
        records.set(requestId, {});
      }

      const rec = records.get(requestId)!;
      rec.request_id = requestId;
      rec.request_time = rec.request_time || timeStr || '';
      rec.method = rec.method || sendMatch.groups.method;
      rec.uri = rec.uri || sendMatch.groups.uri;
      rec.request_size = rec.request_size || sendMatch.groups.req_size;
      rec.send_line = line;
    }
  }

  // Filter and convert to array - include any request with at least a send or response line
  const allRequests = Array.from(records.values()).filter(
    (rec): rec is HttpRequest =>
      !!rec.uri && (!!rec.send_line || !!rec.response_line)
  ) as HttpRequest[];

  // Fill in missing fields with empty strings
  allRequests.forEach((rec) => {
    rec.request_time = rec.request_time || '';
    rec.response_time = rec.response_time || '';
    rec.method = rec.method || '';
    rec.uri = rec.uri || '';
    rec.status = rec.status || '';
    rec.request_size = rec.request_size || '';
    rec.response_size = rec.response_size || '';
    rec.request_duration_ms = rec.request_duration_ms || '';
    rec.send_line = rec.send_line || '';
    rec.response_line = rec.response_line || '';
  });

  return {
    httpRequests: allRequests,
    rawLogLines,
  };
}

export function parseLogFile(logContent: string): LogParserResult {
  // First parse all HTTP requests
  const { httpRequests, rawLogLines } = parseAllHttpRequests(logContent);

  // Filter for sync-specific requests and add conn_id
  const syncRequests: SyncRequest[] = [];
  const lines = logContent.split('\n');

  // Build a map of request_id to conn_id by scanning lines again
  const connIdMap = new Map<string, string>();
  for (const line of lines) {
    if (line.includes('request_id=') && line.includes('/sync')) {
      const reqIdMatch = line.match(/request_id="([^"]+)"/);
      const connMatch = line.match(/conn_id="([^"]+)"/);
      if (reqIdMatch && connMatch) {
        connIdMap.set(reqIdMatch[1], connMatch[1]);
      }
    }
  }

  // Filter HTTP requests for sync URIs and add conn_id
  for (const httpReq of httpRequests) {
    if (httpReq.uri.includes('/sync')) {
      const connId = connIdMap.get(httpReq.request_id) || '';
      syncRequests.push({
        ...httpReq,
        conn_id: connId,
      });
    }
  }

  // Extract unique connection IDs
  const connectionIds = [
    ...new Set(syncRequests.map((r) => r.conn_id).filter((c) => c)),
  ];

  return {
    requests: syncRequests,
    connectionIds,
    rawLogLines,
  };
}

export function exportToCSV(requests: SyncRequest[]): void {
  if (requests.length === 0) {
    alert('No data to export');
    return;
  }

  // CSV headers
  const headers = [
    'request_id',
    'request_time',
    'response_time',
    'method',
    'uri',
    'conn_id',
    'status',
    'request_size',
    'response_size',
    'request_duration_ms',
    'send_line',
    'response_line',
  ];

  // Build CSV content
  let csv = headers.join(',') + '\n';

  requests.forEach((req) => {
    const row = headers.map((h) => {
      const value = String(req[h as keyof SyncRequest] || '');
      // Escape quotes and wrap in quotes if contains comma or newline
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csv += row.join(',') + '\n';
  });

  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'sync_requests.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
