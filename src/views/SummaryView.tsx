import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { LogActivityChart } from '../components/LogActivityChart';
import { calculateTimeRangeMicros } from '../utils/timeUtils';
import type { LogLevel, ParsedLogLine } from '../types/log.types';
import type { TimestampMicros } from '../types/time.types';
import styles from './SummaryView.module.css';

export function SummaryView() {
  const navigate = useNavigate();
  const {
    rawLogLines,
    allHttpRequests,
    allRequests,
    connectionIds,
    startTime,
    endTime,
    setTimeFilter,
  } = useLogStore();

  // Local zoom state (in microseconds)
  const [localStartTime, setLocalStartTime] = useState<TimestampMicros | null>(null);
  const [localEndTime, setLocalEndTime] = useState<TimestampMicros | null>(null);

  // Clear local zoom when global filters change
  useEffect(() => {
    setLocalStartTime(null);
    setLocalEndTime(null);
  }, [startTime, endTime]);

  const handleTimeRangeSelected = useCallback((startUs: TimestampMicros, endUs: TimestampMicros) => {
    setLocalStartTime(startUs);
    setLocalEndTime(endUs);
  }, []);

  const handleResetZoom = useCallback(() => {
    // If there's a local selection, clear it
    if (localStartTime !== null || localEndTime !== null) {
      setLocalStartTime(null);
      setLocalEndTime(null);
    } else if (rawLogLines.length > 0 && startTime && endTime) {
      // No local selection - check if we can zoom out to full range
      const times = rawLogLines.map((line) => line.timestampUs);
      const fullMinTime = Math.min(...times);
      const fullMaxTime = Math.max(...times);
      const { startUs: currentStartUs, endUs: currentEndUs } = calculateTimeRangeMicros(startTime, endTime, fullMinTime, fullMaxTime);
      
      // Only zoom out if current range is narrower than full range (with 1000us = 1ms tolerance)
      if (currentStartUs > fullMinTime + 1000 || currentEndUs < fullMaxTime - 1000) {
        // Set as local selection so Apply button appears
        setLocalStartTime(fullMinTime);
        setLocalEndTime(fullMaxTime);
      }
    }
  }, [localStartTime, localEndTime, rawLogLines, startTime, endTime]);

  const handleApplyGlobally = useCallback(() => {
    if (localStartTime !== null && localEndTime !== null && rawLogLines.length > 0) {
      const times = rawLogLines.map((line) => line.timestampUs);
      const fullMinTime = Math.min(...times);
      const fullMaxTime = Math.max(...times);
      
      // If selection matches full range (within 1000us = 1ms tolerance), clear the filter instead
      if (Math.abs(localStartTime - fullMinTime) <= 1000 && Math.abs(localEndTime - fullMaxTime) <= 1000) {
        setTimeFilter(null, null);
      } else {
        // Find the closest log lines to the selected timestamps and use their original timestamp strings
        const startLine = rawLogLines.reduce((closest, line) => 
          Math.abs(line.timestampUs - localStartTime) < Math.abs(closest.timestampUs - localStartTime) ? line : closest
        );
        const endLine = rawLogLines.reduce((closest, line) => 
          Math.abs(line.timestampUs - localEndTime) < Math.abs(closest.timestampUs - localEndTime) ? line : closest
        );
        setTimeFilter(startLine.isoTimestamp, endLine.isoTimestamp);
      }
      
      // Clear local selection state immediately
      setLocalStartTime(null);
      setLocalEndTime(null);
    }
  }, [localStartTime, localEndTime, rawLogLines, setTimeFilter]);

  // Check if local selection differs from current global filter
  const shouldShowApplyButton = useMemo(() => {
    if (localStartTime === null || localEndTime === null) return false;
    
    // If no global filter, always show apply button
    if (!startTime || !endTime) return true;
    
    const times = rawLogLines.map((line) => line.timestampUs);
    const minLogTimeUs = times.length > 0 ? Math.min(...times) : 0;
    const maxLogTimeUs = times.length > 0 ? Math.max(...times) : 0;
    const { startUs: globalStartUs, endUs: globalEndUs } = calculateTimeRangeMicros(startTime, endTime, minLogTimeUs, maxLogTimeUs);
    
    // Show if selection differs from global filter (with 1000us = 1ms tolerance)
    return Math.abs(localStartTime - globalStartUs) > 1000 || Math.abs(localEndTime - globalEndUs) > 1000;
  }, [localStartTime, localEndTime, startTime, endTime, rawLogLines]);

  // Calculate log statistics
  const stats = useMemo(() => {
    if (rawLogLines.length === 0) {
      return {
        totalLogLines: 0,
        filteredLogLines: [] as ParsedLogLine[],
        timeSpan: { start: '', end: '' },
        errors: 0,
        warnings: 0,
        errorsByType: [] as Array<{ type: string; count: number }>,
        warningsByType: [] as Array<{ type: string; count: number }>,
        httpErrorsByStatus: [] as Array<{ status: string; count: number }>,
        slowestHttpRequests: [] as Array<{
          id: string;
          duration: number;
          method: string;
          uri: string;
          status: string;
        }>,
        syncRequestsByConnection: [] as Array<{ connId: string; count: number }>,
      };
    }

    // Calculate time range if filters are set (in microseconds)
    let timeRangeUs: { startUs: TimestampMicros; endUs: TimestampMicros } | null = null;
    if (startTime || endTime) {
      const times = rawLogLines.map((line) => line.timestampUs).filter((t) => t > 0);
      const minLogTimeUs = times.length > 0 ? Math.min(...times) : 0;
      const maxLogTimeUs = times.length > 0 ? Math.max(...times) : 0;
      timeRangeUs = calculateTimeRangeMicros(startTime, endTime, minLogTimeUs, maxLogTimeUs);
    }

    // Apply local zoom if set
    if (localStartTime !== null && localEndTime !== null) {
      timeRangeUs = {
        startUs: localStartTime,
        endUs: localEndTime,
      };
    }

    // Filter log lines by time range
    const filteredLogLines = rawLogLines.filter((line) => {
      if (!timeRangeUs) return true;
      return line.timestampUs >= timeRangeUs.startUs && line.timestampUs <= timeRangeUs.endUs;
    });

    // Filter HTTP requests by time range
    const filteredHttpRequests = allHttpRequests.filter((req) => {
      if (!timeRangeUs) return true;
      if (!req.responseLineNumber) return false;
      const responseLine = rawLogLines.find(l => l.lineNumber === req.responseLineNumber);
      if (!responseLine || !responseLine.timestampUs) return false;
      return responseLine.timestampUs >= timeRangeUs.startUs && responseLine.timestampUs <= timeRangeUs.endUs;
    });

    // Filter sync requests by time range
    const filteredSyncRequests = allRequests.filter((req) => {
      if (!timeRangeUs) return true;
      if (!req.responseLineNumber) return false;
      const responseLine = rawLogLines.find(l => l.lineNumber === req.responseLineNumber);
      if (!responseLine || !responseLine.timestampUs) return false;
      return responseLine.timestampUs >= timeRangeUs.startUs && responseLine.timestampUs <= timeRangeUs.endUs;
    });

    // Time span (from filtered logs)
    const firstTimestamp = filteredLogLines[0]?.displayTime || '';
    const lastTimestamp = filteredLogLines[filteredLogLines.length - 1]?.displayTime || '';

    // Helper function to extract the core error message without timestamp and log level
    const extractCoreMessage = (message: string): string => {
      // Remove timestamp prefix (e.g., "2026-01-28T13:24:43.950890Z")
      // Pattern: ISO timestamp followed by log level
      const match = message.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+(?:TRACE|DEBUG|INFO|WARN|ERROR)\s+(.+)$/);
      if (match && match[1]) {
        return match[1].trim();
      }
      // If pattern doesn't match, return original message
      return message;
    };

    // Count errors and warnings by level (from filtered logs)
    const levelCounts: Record<LogLevel, number> = {
      TRACE: 0,
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      UNKNOWN: 0,
    };

    const errorMessages: Record<string, number> = {};
    const warningMessages: Record<string, number> = {};

    filteredLogLines.forEach((line) => {
      levelCounts[line.level]++;
      if (line.level === 'ERROR') {
        const coreMessage = extractCoreMessage(line.message);
        errorMessages[coreMessage] = (errorMessages[coreMessage] || 0) + 1;
      } else if (line.level === 'WARN') {
        const coreMessage = extractCoreMessage(line.message);
        warningMessages[coreMessage] = (warningMessages[coreMessage] || 0) + 1;
      }
    });

    // Sort errors and warnings by frequency
    const errorsByType = Object.entries(errorMessages)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const warningsByType = Object.entries(warningMessages)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // HTTP errors by status (from filtered requests)
    const httpStatusCounts: Record<string, number> = {};
    filteredHttpRequests.forEach((req) => {
      if (req.status) {
        const statusCode = req.status.split(' ')[0]; // Extract just the number
        httpStatusCounts[statusCode] =
          (httpStatusCounts[statusCode] || 0) + 1;
      }
    });

    // Filter for error statuses (4xx, 5xx)
    const httpErrorsByStatus = Object.entries(httpStatusCounts)
      .filter(([status]) => {
        const code = parseInt(status, 10);
        return code >= 400;
      })
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Slowest HTTP requests (from filtered requests)
    const slowestHttpRequests = filteredHttpRequests
      .filter(req => !/\/sync(\?|$)/i.test(req.uri))
      .map((req) => ({
        id: req.requestId,
        duration:
          typeof req.requestDurationMs === 'number'
            ? req.requestDurationMs
            : parseInt(req.requestDurationMs as string, 10) || 0,
        method: req.method,
        uri: req.uri,
        status: req.status,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Sync requests by connection (from filtered requests)
    const syncByConn: Record<string, number> = {};
    filteredSyncRequests.forEach((req) => {
      syncByConn[req.connId] = (syncByConn[req.connId] || 0) + 1;
    });

    const syncRequestsByConnection = connectionIds
      .map((connId) => ({
        connId,
        count: syncByConn[connId] || 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      totalLogLines: filteredLogLines.length,
      filteredLogLines, // Include for chart
      timeSpan: { start: firstTimestamp, end: lastTimestamp },
      errors: levelCounts.ERROR,
      warnings: levelCounts.WARN,
      errorsByType,
      warningsByType,
      httpErrorsByStatus,
      slowestHttpRequests,
      syncRequestsByConnection,
    };
  }, [rawLogLines, allHttpRequests, allRequests, connectionIds, startTime, endTime, localStartTime, localEndTime]);

  if (rawLogLines.length === 0) {
    return (
      <div className="app">
        <div className="header-compact">
          <BurgerMenu />
          <h1 className="header-title">Summary</h1>
        </div>
        <div className="content">
          <p>No logs loaded. Please upload a log file to see the summary.</p>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(0)}ms`;
  };

  return (
    <div className="app">
      <div className="header-compact">
        <div className="header-left">
          <BurgerMenu />
          <h1 className="header-title">Summary</h1>
        </div>
        
        <div className="header-right">
          <TimeRangeSelector />
        </div>
      </div>

      <div className="content">
        {/* Log Overview */}
        <section className={styles.summarySection}>
          <h2>Logs Over Time: {stats.totalLogLines} lines</h2>
          
          {/* Activity Chart */}
          <div className={styles.activityChartContainer}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', visibility: shouldShowApplyButton ? 'visible' : 'hidden', opacity: shouldShowApplyButton ? 1 : 0, transition: 'opacity 0.15s ease-in-out' }}>
                {shouldShowApplyButton && localStartTime !== null && localEndTime !== null && (
                  <>
                    <span style={{ fontSize: '12px', color: '#0066cc', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      Selected: {new Date(localStartTime).toISOString().split('T')[1].split('.')[0]} - {new Date(localEndTime).toISOString().split('T')[1].split('.')[0]} UTC
                    </span>
                    <button
                      onClick={handleResetZoom}
                      className="btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyGlobally}
                      className="btn-primary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      Apply
                    </button>
                  </>
                )}
              </div>
            </div>
            <LogActivityChart 
              logLines={stats.filteredLogLines} 
              onTimeRangeSelected={handleTimeRangeSelected}
              onResetZoom={handleResetZoom}
            />
          </div>
        </section>

        {/* Errors & Warnings Section */}
        <div className={styles.errorsWarningsGrid}>
          {/* Errors Section */}
          {stats.errors > 0 && (
            <section className={styles.summarySection}>
              {stats.errorsByType.length > 0 && (
                <div className={styles.summaryTableContainer}>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>
                          Top Errors (
                          <span
                            className={styles.clickableHeading}
                            onClick={() => navigate('/logs?filter=ERROR')}
                          >
                            {stats.errors}
                          </span>
                          )
                        </th>
                        <th className={styles.alignRight}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.errorsByType.map((error, idx) => (
                        <tr key={idx}>
                          <td>
                            <button
                              className={styles.actionLink}
                              title={error.type}
                              onClick={() =>
                                navigate(
                                  `/logs?filter=${encodeURIComponent(
                                    error.type
                                  )}`
                                )
                              }
                              style={{ textAlign: 'left', whiteSpace: 'normal' }}
                            >
                              {error.type.substring(0, 100)}
                            </button>
                          </td>
                          <td className={styles.alignRight}>{error.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Warnings Section */}
          {stats.warnings > 0 && (
            <section className={styles.summarySection}>
              {stats.warningsByType.length > 0 && (
                <div className={styles.summaryTableContainer}>
                  <table className={styles.summaryTable}>
                    <thead>
                      <tr>
                        <th>
                          Top Warnings (
                          <span
                            className={styles.clickableHeading}
                            onClick={() => navigate('/logs?filter=WARN')}
                          >
                            {stats.warnings}
                          </span>
                          )
                        </th>
                        <th className={styles.alignRight}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.warningsByType.map((warning, idx) => (
                        <tr key={idx}>
                          <td>
                            <button
                              className={styles.actionLink}
                              title={warning.type}
                              onClick={() =>
                                navigate(
                                  `/logs?filter=${encodeURIComponent(
                                    warning.type
                                  )}`
                                )
                              }
                              style={{ textAlign: 'left', whiteSpace: 'normal' }}
                            >
                              {warning.type.substring(0, 100)}
                            </button>
                          </td>
                          <td className={styles.alignRight}>{warning.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* HTTP Errors Section */}
        {stats.httpErrorsByStatus.length > 0 && (
          <section className={styles.summarySection}>
            <h2>HTTP Errors</h2>
            <div className={styles.summaryTableContainer}>
              <table className={styles.summaryTable}>
                <thead>
                  <tr>
                    <th>Status Code</th>
                    <th className={styles.alignRight}>Count</th>
                    <th className={styles.alignRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.httpErrorsByStatus.map((error, idx) => (
                    <tr key={idx}>
                      <td>{error.status}</td>
                      <td className={styles.alignRight}>{error.count}</td>
                      <td className={styles.alignRight}>
                        <button
                          className={styles.actionLink}
                          onClick={() =>
                            navigate(`/http_requests?status=${error.status}`)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Slowest HTTP Requests Section */}
        {stats.slowestHttpRequests.length > 0 && (
          <section className={styles.summarySection}>
            <h2>Slowest HTTP Requests</h2>
            <div className={styles.summaryTableContainer}>
              <table className={styles.summaryTable}>
                <thead>
                  <tr>
                    <th>Duration</th>
                    <th>Method</th>
                    <th>Request</th>
                    <th>URI</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Find the common prefix for all URIs
                    const filtered = stats.slowestHttpRequests;
                    const uris = filtered.map(req => req.uri);
                    function getCommonPrefix(arr: string[]): string {
                      if (!arr.length) return '';
                      let prefix = arr[0];
                      for (let i = 1; i < arr.length; i++) {
                        while (arr[i].indexOf(prefix) !== 0) {
                          prefix = prefix.slice(0, -1);
                          if (!prefix) return '';
                        }
                      }
                      // Remove trailing slash for cleaner display
                      return prefix.replace(/\/$/, '');
                    }
                    const commonPrefix = getCommonPrefix(uris);
                    return filtered.map((req) => {
                      const statusCode = parseInt(req.status, 10);
                      const statusClass = statusCode >= 400 ? styles.statusError : styles.statusSuccess;
                      return (
                      <tr key={req.id}>
                        <td>
                          <span className={styles.durationBadge}>
                            {formatDuration(req.duration)}
                          </span>
                        </td>
                        <td>{req.method}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#007acc' }}>
                          <a
                            href={`#/http_requests?id=${req.id}`}
                            className={styles.actionLink}
                            title={req.id}
                            style={{ textDecoration: 'underline', color: '#007acc' }}
                          >
                            {req.id}
                          </a>
                        </td>
                        <td className={styles.uriCell}>
                          {commonPrefix && req.uri !== commonPrefix
                            ? '/' + req.uri.replace(commonPrefix, '').replace(/^\//, '')
                            : req.uri}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusClass}`}>
                            {req.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sync Requests by Connection Section */}
        {stats.syncRequestsByConnection.length > 0 && (
          <section className={styles.summarySection}>
            <h2>Sync Requests by Connection</h2>
            <div className={styles.summaryTableContainer}>
              <table className={styles.summaryTable}>
                <thead>
                  <tr>
                    <th>Connection ID</th>
                    <th className={styles.alignRight}>Request Count</th>
                    <th className={styles.alignRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.syncRequestsByConnection.map((item) => (
                    <tr key={item.connId}>
                      <td>{item.connId}</td>
                      <td className={styles.alignRight}>{item.count}</td>
                      <td className={styles.alignRight}>
                        <button
                          className={styles.actionLink}
                          onClick={() =>
                            navigate(`/http_requests/sync?conn=${item.connId}`)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
