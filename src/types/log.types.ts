export interface SyncRequest {
  request_id: string;
  request_time: string;
  response_time: string;
  method: string;
  uri: string;
  conn_id: string;
  status: string;
  request_size: string;
  response_size: string;
  request_duration_ms: number | string;
  send_line: string;
  response_line: string;
}

export interface LogParserResult {
  requests: SyncRequest[];
  connectionIds: string[];
}
