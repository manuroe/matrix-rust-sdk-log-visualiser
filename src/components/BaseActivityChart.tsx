import { useMemo, useCallback, type ReactNode } from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar, Line } from '@visx/shape';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import type { TimestampMicros } from '../types/time.types';
import { MICROS_PER_MILLISECOND } from '../types/time.types';
import { useChartInteraction } from '../hooks/useChartInteraction';

/** Generic bucket structure for activity charts */
export interface ActivityBucket {
  timestamp: number;
  timeLabel: string;
  total: number;
}

interface BaseActivityChartProps<TBucket extends ActivityBucket, TCategory extends string> {
  /** Buckets of time-aggregated data */
  buckets: TBucket[];
  /** Maximum count across all buckets (for y-axis scaling) */
  maxCount: number;
  /** Minimum time in microseconds */
  minTime: TimestampMicros;
  /** Maximum time in microseconds */
  maxTime: TimestampMicros;
  /** Ordered list of categories to render (determines stacking order) */
  categories: TCategory[];
  /** Get the color for a category */
  getCategoryColor: (category: TCategory) => string;
  /** Get the count for a category from a bucket */
  getCategoryCount: (bucket: TBucket, category: TCategory) => number;
  /** Render custom tooltip content */
  renderTooltipContent: (bucket: TBucket, categories: TCategory[]) => ReactNode;
  /** Callback when user selects a time range. Values are in microseconds. */
  onTimeRangeSelected?: (startUs: TimestampMicros, endUs: TimestampMicros) => void;
  /** Callback when user double-clicks to reset zoom */
  onResetZoom?: () => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Chart height in pixels */
  height?: number;
}

/**
 * Base component for stacked bar activity charts.
 * Used by LogActivityChart and HttpActivityChart.
 */
export function BaseActivityChart<TBucket extends ActivityBucket, TCategory extends string>({
  buckets,
  maxCount,
  minTime,
  maxTime,
  categories,
  getCategoryColor,
  getCategoryCount,
  renderTooltipContent,
  onTimeRangeSelected,
  onResetZoom,
  emptyMessage = 'No data to display',
  height = 120,
}: BaseActivityChartProps<TBucket, TCategory>) {
  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip<TBucket>();

  // Helper to format timestamp as HH:MM:SS in UTC (converts from microseconds)
  const formatTime = useCallback((timestampUs: number): string => {
    const date = new Date(timestampUs / MICROS_PER_MILLISECOND);
    return date.toISOString().split('T')[1].split('.')[0]; // Gets HH:MM:SS in UTC
  }, []);

  const width = 800;
  const margin = useMemo(() => ({ top: 10, right: 10, bottom: 30, left: 50 }), []);
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: buckets.map((d) => d.timeLabel),
        range: [0, xMax],
        padding: 0,
      }),
    [buckets, xMax]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, maxCount],
        range: [yMax, 0],
        nice: true,
      }),
    [maxCount, yMax]
  );

  const getBucketAtIndex = useCallback(
    (index: number): TBucket | undefined => buckets[index],
    [buckets]
  );

  const { state, handlers } = useChartInteraction<TBucket>({
    marginLeft: margin.left,
    xMax,
    minTime,
    maxTime,
    formatTime,
    hideTooltip,
    onTimeRangeSelected,
    onResetZoom,
    getBucketAtIndex,
    xScaleStep: xScale.step(),
    bucketCount: buckets.length,
  });

  const { cursorX, cursorTimeLabel, isSelecting, selectionStart, selectionEnd } = state;

  if (buckets.length === 0) {
    return (
      <div className="chart-empty" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
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
                  {categories.map((category) => {
                    const count = getCategoryCount(bucket, category);
                    if (count === 0) return null;

                    const barHeight = yMax - yScale(count);
                    const barY = currentY - barHeight;

                    const bar = (
                      <Bar
                        key={category}
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        fill={getCategoryColor(category)}
                        opacity={0.9}
                      >
                        <title>{`${bucket.timeLabel} - ${category}: ${count}`}</title>
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
              onMouseDown={handlers.handleMouseDown}
              onMouseUp={handlers.handleMouseUp}
              onMouseMove={(e) => handlers.handleMouseMove(e, showTooltip)}
              onDoubleClick={handlers.handleDoubleClick}
              onMouseLeave={handlers.handleMouseLeave}
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
            {renderTooltipContent(tooltipData, categories)}
          </TooltipWithBounds>
        )}
      </div>
    </div>
  );
}
