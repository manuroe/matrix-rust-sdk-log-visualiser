import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLogStore } from '../stores/logStore';
import { LogDisplayView } from './LogDisplayView';
import { BurgerMenu } from '../components/BurgerMenu';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import { calculateTimeRangeMicros } from '../utils/timeUtils';

export function LogsView() {
  const [searchParams] = useSearchParams();
  const { rawLogLines, startTime, endTime } = useLogStore();
  
  // Get filter from URL param to prefill the input (not for automatic filtering)
  const filterPrefill = searchParams.get('filter') || '';

  // Filter log lines by time range only
  const filteredLines = useMemo(() => {
    if (rawLogLines.length === 0) return [];

    // Calculate time range with min/max log time as reference
    const times = rawLogLines
      .map((line) => line.timestampUs)
      .filter((t) => t > 0);
    const minLogTimeUs = times.length > 0 ? Math.min(...times) : 0;
    const maxLogTimeUs = times.length > 0 ? Math.max(...times) : 0;

    const { startUs, endUs } = calculateTimeRangeMicros(startTime, endTime, minLogTimeUs, maxLogTimeUs);

    return rawLogLines.filter((line) => {
      // Time range filter only
      return line.timestampUs >= startUs && line.timestampUs <= endUs;
    });
  }, [rawLogLines, startTime, endTime]);

  // Calculate total (all raw log lines)
  const totalCount = rawLogLines.length;

  // For LogsView, define prev/next boundaries as the edges of filtered logs
  // This allows users to expand gaps to/from the start and end of the filtered set
  const prevRequestLineRange = filteredLines.length > 0 ? {
    start: 0,
    end: 0
  } : undefined;

  const nextRequestLineRange = filteredLines.length > 0 ? {
    start: rawLogLines.length - 1,
    end: rawLogLines.length - 1
  } : undefined;

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
            timestamp: line.displayTime
          }))}
          requestFilter={filterPrefill}
          prevRequestLineRange={prevRequestLineRange}
          nextRequestLineRange={nextRequestLineRange}
        />
      </div>
    </div>
  );
}
