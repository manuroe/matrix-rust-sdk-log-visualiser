import { useMemo } from 'react';
import { useLogStore } from '../stores/logStore';
import { LogDisplayView } from './LogDisplayView';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { calculateTimeRange, timeToMs } from '../utils/timeUtils';

export function LogsView() {
  const { rawLogLines, startTime, endTime } = useLogStore();

  // Filter log lines by time range
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
        <LogDisplayView logLines={filteredLines} />
      </div>
    </div>
  );
}
