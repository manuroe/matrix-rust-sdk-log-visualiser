import { useMemo, useCallback, useState, type MouseEvent } from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar, Line } from '@visx/shape';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import type { ParsedLogLine, LogLevel } from '../types/log.types';
import { timeToMs } from '../utils/timeUtils';

interface LogActivityChartProps {
  logLines: ParsedLogLine[];
  onTimeRangeSelected?: (startMs: number, endMs: number) => void;
  onResetZoom?: () => void;
}

interface TimeBucket {
  timestamp: number;
  timeLabel: string;
  counts: Record<LogLevel, number>;
  total: number;
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  TRACE: '#808080',
  DEBUG: '#569cd6',
  INFO: '#4ec9b0',
  WARN: '#ff9800',
  ERROR: '#f44336',
  UNKNOWN: '#858585',
};

const LOG_LEVEL_ORDER: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'UNKNOWN'];

export function LogActivityChart({ logLines, onTimeRangeSelected, onResetZoom }: LogActivityChartProps) {
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<TimeBucket>();

  const [cursorX, setCursorX] = useState<number | undefined>();
  const [cursorTimeLabel, setCursorTimeLabel] = useState<string | undefined>();
  
  // Selection mode state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; time: number } | undefined>();
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; time: number } | undefined>();

  // Helper to format timestamp as HH:MM:SS in UTC
  const formatTime = useCallback((timestampMs: number): string => {
    const date = new Date(timestampMs);
    return date.toISOString().split('T')[1].split('.')[0]; // Gets HH:MM:SS in UTC
  }, []);

  const { buckets, maxCount, minTime, maxTime } = useMemo(() => {
    if (logLines.length === 0) {
      return { buckets: [], maxCount: 0, minTime: 0, maxTime: 0 };
    }

    // Find time range
    const timestamps = logLines.map((line) => timeToMs(line.timestamp));
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime;

    // Calculate bucket size to display ~100 bars
    const targetBars = 100;
    let bucketSize = 1000; // Start with 1 second
    if (timeRange > 0) {
      bucketSize = Math.max(1000, Math.ceil(timeRange / targetBars));
    }

    // Helper to format timestamp as HH:MM:SS in UTC
    const formatTime = (timestampMs: number): string => {
      const date = new Date(timestampMs);
      return date.toISOString().split('T')[1].split('.')[0]; // Gets HH:MM:SS in UTC
    };

    // Create buckets for the entire time range
    const bucketMap = new Map<number, TimeBucket>();
    
    // Initialize all buckets in the time range
    const firstBucketKey = Math.floor(minTime / bucketSize) * bucketSize;
    const lastBucketKey = Math.floor(maxTime / bucketSize) * bucketSize;
    
    for (let bucketKey = firstBucketKey; bucketKey <= lastBucketKey; bucketKey += bucketSize) {
      bucketMap.set(bucketKey, {
        timestamp: bucketKey,
        timeLabel: formatTime(bucketKey),
        counts: {
          TRACE: 0,
          DEBUG: 0,
          INFO: 0,
          WARN: 0,
          ERROR: 0,
          UNKNOWN: 0,
        },
        total: 0,
      });
    }
    
    // Fill buckets with log data
    logLines.forEach((line) => {
      const time = timeToMs(line.timestamp);
      const bucketKey = Math.floor(time / bucketSize) * bucketSize;
      
      const bucket = bucketMap.get(bucketKey);
      if (bucket) {
        bucket.counts[line.level]++;
        bucket.total++;
      }
    });

    // Convert to sorted array
    const buckets = Array.from(bucketMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const maxCount = Math.max(...buckets.map((b) => b.total));

    return { buckets, maxCount, minTime, maxTime };
  }, [logLines, formatTime]);

  if (buckets.length === 0) {
    return <div className="chart-empty">No log data to display</div>;
  }

  const width = 800;
  const height = 120;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Scales
  const xScale = scaleBand<string>({
    domain: buckets.map((d) => d.timeLabel),
    range: [0, xMax],
    padding: 0,
  });

  const yScale = scaleLinear<number>({
    domain: [0, maxCount],
    range: [yMax, 0],
    nice: true,
  });

  const handleMouseDown = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const x = point.x - margin.left;
      if (x < 0 || x > xMax) return;

      // Calculate time at click position
      const progress = x / xMax;
      const timeRange = (maxTime ?? 0) - (minTime ?? 0);
      const clickTime = (minTime ?? 0) + progress * timeRange;

      // Start selection mode
      setIsSelecting(true);
      setSelectionStart({ x: point.x, time: clickTime });
      setSelectionEnd({ x: point.x, time: clickTime });
      
      // Hide tooltip during selection
      hideTooltip();
      setCursorX(undefined);
    },
    [margin, xMax, minTime, maxTime, hideTooltip]
  );

  const handleMouseUp = useCallback(
    () => {
      if (!isSelecting || !selectionStart || !selectionEnd) {
        setIsSelecting(false);
        return;
      }

      // Apply time filter
      const startTime = Math.min(selectionStart.time, selectionEnd.time);
      const endTime = Math.max(selectionStart.time, selectionEnd.time);
      
      // Only apply if there's a meaningful range (> 100ms)
      if (endTime - startTime > 100 && onTimeRangeSelected) {
        onTimeRangeSelected(startTime, endTime);
      }

      // Clear selection and return to normal mode
      setIsSelecting(false);
      setSelectionStart(undefined);
      setSelectionEnd(undefined);
    },
    [isSelecting, selectionStart, selectionEnd, onTimeRangeSelected]
  );

  const handleDoubleClick = useCallback(
    () => {
      if (onResetZoom) {
        onResetZoom();
      }
    },
    [onResetZoom]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const x = point.x - margin.left;
      if (x < 0 || x > xMax) {
        if (!isSelecting) {
          hideTooltip();
          setCursorX(undefined);
        }
        return;
      }

      // Calculate actual cursor time based on position
      const progress = x / xMax;
      const timeRange = (maxTime ?? 0) - (minTime ?? 0);
      const cursorTime = (minTime ?? 0) + progress * timeRange;

      if (isSelecting) {
        // Selection mode: update end cursor position
        setSelectionEnd({ x: point.x, time: cursorTime });
      } else {
        // Normal mode: show tooltip
        const step = xScale.step();
        const index = Math.floor(x / step);
        
        if (index >= 0 && index < buckets.length) {
          const bucket = buckets[index];
          
          setCursorX(point.x);
          setCursorTimeLabel(formatTime(cursorTime));
          showTooltip({
            tooltipData: bucket,
            tooltipLeft: event.clientX,
            tooltipTop: event.clientY,
          });
        }
      }
    },
    [buckets, xScale, xMax, margin, minTime, maxTime, formatTime, showTooltip, hideTooltip, isSelecting]
  );

  return (
    <div className="log-activity-chart" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <Group left={margin.left} top={margin.top}>
          {/* Render stacked bars */}
          {buckets.map((bucket) => {
            const barX = xScale(bucket.timeLabel) ?? 0;
            const barWidth = xScale.bandwidth();
            let currentY = yMax;

            return (
              <Group key={bucket.timestamp}>
                {LOG_LEVEL_ORDER.map((level) => {
                  const count = bucket.counts[level];
                  if (count === 0) return null;

                  const barHeight = yMax - yScale(count);
                  const barY = currentY - barHeight;

                  const bar = (
                    <Bar
                      key={level}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={LOG_LEVEL_COLORS[level]}
                      opacity={0.9}
                    >
                      <title>{`${bucket.timeLabel} - ${level}: ${count}`}</title>
                    </Bar>
                  );

                  currentY = barY;
                  return bar;
                })}
              </Group>
            );
          })}

          {/* Invisible overlay for mouse events - must be after bars to be on top */}
          <rect
            width={xMax}
            height={yMax}
            fill="transparent"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onDoubleClick={handleDoubleClick}
            onMouseLeave={() => {
              hideTooltip();
              setCursorX(undefined);
            }}
            style={{ cursor: isSelecting ? 'col-resize' : 'crosshair' }}
          />
          
          {/* Axes */}
          <AxisBottom
            top={yMax}
            scale={xScale}
            tickFormat={() => ''} // Hide automatic ticks
            stroke="#666"
            tickStroke="#666"
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 9,
              textAnchor: 'middle',
            })}
          />
          
          {/* Manual start and end time labels - use actual min/max times from data */}
          {buckets.length > 0 && (
            <>
              {/* Start time label - actual minimum time */}
              <text
                x={xScale(buckets[0].timeLabel) ?? 0}
                y={yMax + 16}
                textAnchor="start"
                fontSize={9}
                fill="#666"
                pointerEvents="none"
              >
                {formatTime(minTime)}
              </text>
              {/* End time label - actual maximum time */}
              <text
                x={(xScale(buckets[buckets.length - 1].timeLabel) ?? 0) + (xScale.bandwidth() ?? 0)}
                y={yMax + 16}
                textAnchor="end"
                fontSize={9}
                fill="#666"
                pointerEvents="none"
              >
                {formatTime(maxTime)}
              </text>
            </>
          )}
          <AxisLeft
            scale={yScale}
            stroke="#666"
            tickStroke="#666"
            numTicks={4}
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 10,
              textAnchor: 'end',
              dx: -4,
            })}
          />
          
          {/* Selection mode: two cursors and highlighted area */}
          {isSelecting && selectionStart && selectionEnd && (
            <>
              {/* Highlighted selection area */}
              <rect
                x={Math.min(selectionStart.x, selectionEnd.x) - margin.left}
                y={0}
                width={Math.abs(selectionEnd.x - selectionStart.x)}
                height={yMax}
                fill="rgba(33, 150, 243, 0.2)"
                pointerEvents="none"
              />
              {/* Start cursor */}
              <Line
                from={{ x: selectionStart.x - margin.left, y: 0 }}
                to={{ x: selectionStart.x - margin.left, y: yMax }}
                stroke="#2196f3"
                strokeWidth={2}
                pointerEvents="none"
              />
              {/* End cursor */}
              <Line
                from={{ x: selectionEnd.x - margin.left, y: 0 }}
                to={{ x: selectionEnd.x - margin.left, y: yMax }}
                stroke="#2196f3"
                strokeWidth={2}
                pointerEvents="none"
              />
              {/* Time labels */}
              <text
                x={selectionStart.x - margin.left}
                y={yMax + 20}
                textAnchor="middle"
                fontSize={10}
                fill="#2196f3"
                fontWeight="bold"
                pointerEvents="none"
              >
                {formatTime(selectionStart.time)}
              </text>
              <text
                x={selectionEnd.x - margin.left}
                y={yMax + 20}
                textAnchor="middle"
                fontSize={10}
                fill="#2196f3"
                fontWeight="bold"
                pointerEvents="none"
              >
                {formatTime(selectionEnd.time)}
              </text>
            </>
          )}
          
          {/* Normal mode: single cursor line and tooltip */}
          {!isSelecting && tooltipData && cursorX !== undefined && (
            <>
              <Line
                from={{ x: cursorX - margin.left, y: 0 }}
                to={{ x: cursorX - margin.left, y: yMax }}
                stroke="#666"
                strokeWidth={1}
                pointerEvents="none"
                strokeDasharray="4,2"
              />
              {/* Time label on x-axis */}
              <text
                x={cursorX - margin.left}
                y={yMax + 20}
                textAnchor="middle"
                fontSize={10}
                fill="#333"
                fontWeight="bold"
                pointerEvents="none"
              >
                {cursorTimeLabel}
              </text>
            </>
          )}
        </Group>
      </svg>
      
      {/* Tooltip - only show in normal mode */}
      {!isSelecting && tooltipData && tooltipLeft !== undefined && tooltipTop !== undefined && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          offsetLeft={12}
          offsetTop={12}
          style={{
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            pointerEvents: 'none',
            lineHeight: '1.3',
          }}
        >
          <div style={{ marginBottom: '2px', fontWeight: 'bold', fontSize: '10px' }}>
            {tooltipData.timeLabel}
          </div>
          {LOG_LEVEL_ORDER.map((level) => {
            const count = tooltipData.counts[level];
            if (count === 0) return null;
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    backgroundColor: LOG_LEVEL_COLORS[level],
                    borderRadius: '1px',
                  }}
                />
                <span style={{ fontSize: '9px' }}>{level}: {count}</span>
              </div>
            );
          })}
          <div style={{ marginTop: '2px', paddingTop: '2px', borderTop: '1px solid #555', fontSize: '9px' }}>
            Total: {tooltipData.total}
          </div>
        </TooltipWithBounds>
      )}
    </div>
    </div>
  );
}
