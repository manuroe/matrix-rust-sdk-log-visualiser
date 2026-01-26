import type { SyncRequest, LogParserResult } from '../types/log.types';

// Regex patterns for parsing log lines (ported from vanilla JS)
const RESP_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+\/sync[^"]*)"\s+request_size="(?<req_size>[^"]+)"\s+status=(?<status>\S+)\s+response_size="(?<resp_size>[^"]+)"\s+request_duration=(?<duration_val>[0-9.]+)(?<duration_unit>ms|s)/;
const SEND_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+\/sync[^"]*)"\s+request_size="(?<req_size>[^"]+)"(?![^}]*(?:status=|response_size=|request_duration=))/;

export function parseLogFile(logContent: string): LogParserResult {
  const lines = logContent.split('\n');
  const records = new Map<string, Partial<SyncRequest>>();

  for (const line of lines) {
    // Early filter for performance
    if (!line.includes('/sync') || !line.includes('request_id=')) {
      continue;
    }

    // Extract timestamp (position 11+, format: HH:MM:SS.microseconds)
    const timeMatch = line.slice(11).match(/(\d{2}:\d{2}:\d{2}\.\d+)Z/);
    const timeStr = timeMatch ? timeMatch[1] : null;

    // Extract conn_id
    const connMatch = line.match(/conn_id="([^"]+)"/);
    const connId = connMatch ? connMatch[1] : '';

    // Try to match response pattern first
    const respMatch = line.match(RESP_RE);
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
      rec.conn_id = rec.conn_id || connId;
      rec.status = rec.status || respMatch.groups.status;
      rec.response_size = rec.response_size || respMatch.groups.resp_size;
      rec.request_size = rec.request_size || respMatch.groups.req_size;
      rec.request_duration_ms = rec.request_duration_ms || durationMs;
      rec.response_line = line;
      continue;
    }

    // Try to match send pattern
    const sendMatch = line.match(SEND_RE);
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
      rec.conn_id = rec.conn_id || connId;
      rec.request_size = rec.request_size || sendMatch.groups.req_size;
      rec.send_line = line;
    }
  }

  // Filter and convert to array
  const allRequests = Array.from(records.values()).filter(
    (rec): rec is SyncRequest =>
      !!rec.uri && rec.uri.includes('/sync') && (!!rec.send_line || !!rec.response_line)
  ) as SyncRequest[];

  // Fill in missing fields with empty strings
  allRequests.forEach((rec) => {
    rec.request_time = rec.request_time || '';
    rec.response_time = rec.response_time || '';
    rec.method = rec.method || '';
    rec.uri = rec.uri || '';
    rec.conn_id = rec.conn_id || '';
    rec.status = rec.status || '';
    rec.request_size = rec.request_size || '';
    rec.response_size = rec.response_size || '';
    rec.request_duration_ms = rec.request_duration_ms || '';
    rec.send_line = rec.send_line || '';
    rec.response_line = rec.response_line || '';
  });

  // Extract unique connection IDs
  const connectionIds = [
    ...new Set(allRequests.map((r) => r.conn_id).filter((c) => c)),
  ];

  return {
    requests: allRequests,
    connectionIds,
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
