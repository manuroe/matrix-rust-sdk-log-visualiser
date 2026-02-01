import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface WaterfallTimelineProps {
  minTime: number;
  maxTime: number;
  totalDuration: number;
  width?: number; // Optional fixed width in pixels
  minPixelsPerMs?: number; // Minimum pixels per millisecond to ensure visible bars
  cursorContainerRef?: React.RefObject<HTMLDivElement | null>;
  cursorOffsetLeft?: number;
}

export function WaterfallTimeline({
  minTime,
  maxTime,
  totalDuration,
  width,
  cursorContainerRef,
  cursorOffsetLeft = 0,
}: WaterfallTimelineProps) {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorDomRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cursorContainerHeight, setCursorContainerHeight] = useState(0);

  // Calculate the actual timeline width
  const calculatedWidth = width || 800;

  // Determine tick interval based on duration
  const getTickInterval = (duration: number): number => {
    if (duration < 1000) return 100; // Under 1s: 100ms ticks
    if (duration < 5000) return 500; // Under 5s: 500ms ticks
    if (duration < 10000) return 1000; // Under 10s: 1s ticks
    if (duration < 30000) return 5000; // Under 30s: 5s ticks
    if (duration < 60000) return 10000; // Under 1min: 10s ticks
    if (duration < 300000) return 30000; // Under 5min: 30s ticks
    if (duration < 600000) return 60000; // Under 10min: 1min ticks
    return 300000; // 5min ticks
  };

  const tickInterval = getTickInterval(totalDuration);

  // Generate tick marks
  const ticks: { position: number; label: string; time: number }[] = [];
  const firstTick = Math.ceil(minTime / tickInterval) * tickInterval;
  
  for (let time = firstTick; time <= maxTime; time += tickInterval) {
    const position = ((time - minTime) / totalDuration) * calculatedWidth;
    const label = formatTimestamp(time, tickInterval);
    ticks.push({ position, label, time });
  }

  useEffect(() => {
    const target = cursorContainerRef?.current ?? null;
    setPortalTarget(target);
    
    // Set initial height and listen for resize
    if (target) {
      setCursorContainerHeight(target.scrollHeight);
      const resizeObserver = new ResizeObserver(() => {
        setCursorContainerHeight(target.scrollHeight);
      });
      resizeObserver.observe(target);
      return () => resizeObserver.disconnect();
    }
  }, [cursorContainerRef]);

  useEffect(() => {
    const target = portalTarget || containerRef.current;
    if (!target) return;

    const handleMouseMove = (e: MouseEvent) => {
      const isPortalMode = Boolean(portalTarget);
      if (isPortalMode && !cursorDomRef.current) return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const relativeX = x - cursorOffsetLeft;
      const scrollLeft = (target as HTMLElement).scrollLeft || 0;
      const timelineX = relativeX + scrollLeft;
      const containerWidth = rect.width;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        // Check bounds against visible container width, not the full timeline width
        const inBounds = relativeX >= 0 && relativeX <= containerWidth;
        if (inBounds) {
          if (isPortalMode) {
            // Position cursor at absolute timeline position (accounts for scroll)
            cursorDomRef.current!.style.left = `${timelineX}px`;
            cursorDomRef.current!.style.display = 'block';
          } else {
            setCursorPosition(timelineX);
          }
        } else {
          if (isPortalMode) {
            cursorDomRef.current!.style.display = 'none';
          } else {
            setCursorPosition(null);
          }
        }
        rafRef.current = null;
      });
    };

    const handleMouseLeave = () => {
      if (portalTarget && cursorDomRef.current) {
        cursorDomRef.current.style.display = 'none';
      }
      if (!portalTarget) {
        setCursorPosition(null);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    target.addEventListener('mousemove', handleMouseMove);
    target.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      target.removeEventListener('mousemove', handleMouseMove);
      target.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [calculatedWidth, portalTarget, cursorOffsetLeft]);

  return (
    <div className="waterfall-timeline-wrapper" style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className="waterfall-timeline-scale"
        style={{
          width: `${calculatedWidth}px`,
          height: '24px',
          position: 'relative',
          borderBottom: '1px solid #ddd',
          background: '#fafafa',
        }}
      >
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="timeline-tick"
            style={{
              position: 'absolute',
              left: `${tick.position}px`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '1px',
                height: '6px',
                background: '#999',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}
            >
              {tick.label}
            </span>
          </div>
        ))}
        
        {/* Vertical cursor line (header) */}
        {!cursorContainerRef && cursorPosition !== null && (
          <div
            className="waterfall-cursor"
            style={{
              position: 'absolute',
              left: `${cursorPosition}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: '#0066cc',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          />
        )}
      </div>
      {portalTarget &&
        createPortal(
          <div
            className="waterfall-cursor-overlay"
            style={{
              position: 'absolute',
              left: `${cursorOffsetLeft}px`,
              top: 0,
              height: `${cursorContainerHeight}px`,
              width: `${calculatedWidth}px`,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            <div
              ref={cursorDomRef}
              className="waterfall-cursor-line"
              style={{
                position: 'absolute',
                display: 'none',
                top: 0,
                height: '100%',
                width: '1px',
                background: 'rgba(0, 102, 204, 0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>,
          portalTarget
        )}
    </div>
  );
}

// Format timestamp for display
function formatTimestamp(ms: number, interval: number): string {
  if (interval < 1000) {
    // Show milliseconds
    return `${ms.toFixed(0)}ms`;
  } else if (interval < 60000) {
    // Show seconds
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  } else {
    // Show minutes:seconds
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Utility function to calculate pixel position for a request
export function getWaterfallPosition(
  requestTime: number,
  minTime: number,
  totalDuration: number,
  timelineWidth: number
): number {
  return ((requestTime - minTime) / totalDuration) * timelineWidth;
}

// Utility function to calculate bar width
export function getWaterfallBarWidth(
  durationMs: number,
  totalDuration: number,
  timelineWidth: number,
  minWidth: number = 2
): number {
  const calculatedWidth = (durationMs / totalDuration) * timelineWidth;
  return Math.max(calculatedWidth, minWidth);
}
