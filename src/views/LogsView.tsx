import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { LogDisplayView } from './LogDisplayView';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { calculateTimeRange, timeToMs, isoToTime } from '../utils/timeUtils';

export function LogsView() {
  const [searchParams] = useSearchParams();
  const { rawLogLines, startTime, endTime } = useLogStore();
  
  // Get filter from URL param to prefill the input (not for automatic filtering)
  const filterPrefill = searchParams.get('filter') || '';

  // Filter log lines by time range only
  const filteredLines = useMemo(() => {
    if (rawLogLines.length === 0) return [];

    // Calculate time range with max log time as reference
    const times = rawLogLines
      .map((line) => line.timestamp)
      .filter((t) => t)
      .map((t) => timeToMs(t));
    const maxLogTimeMs = times.length > 0 ? Math.max(...times) : 0;

    const { startMs, endMs } = calculateTimeRange(startTime, endTime, maxLogTimeMs);

    return rawLogLines.filter((line) => {
      // Time range filter only
      const lineTimeMs = timeToMs(line.timestamp);
      return lineTimeMs >= startMs && lineTimeMs <= endMs;
    });
  }, [rawLogLines, startTime, endTime]);

  // Calculate total (all raw log lines)
  const totalCount = rawLogLines.length;

  return (
    <div className="app">
      <div className="header-compact">
        <div className="header-left">
          <BurgerMenu />
          <h1 className="header-title">
            All Logs
          </h1>
        </div>
        
        <div className="header-center">
          <div className="stats-compact">
            <span id="shown-count">{filteredLines.length}</span> / <span id="total-count">{totalCount}</span>
          </div>
        </div>
        
        <div className="header-right">
          <TimeRangeSelector />
        </div>
      </div>

      <div className="logs-view-container">
        <LogDisplayView 
          logLines={filteredLines.map(line => ({
            ...line,
            timestamp: isoToTime(line.timestamp)
          }))}
          requestFilter={filterPrefill}
        />
      </div>
    </div>
  );
}
