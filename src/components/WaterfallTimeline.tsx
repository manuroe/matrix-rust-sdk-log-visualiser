import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface WaterfallTimelineProps {
  width?: number; // Optional fixed width in pixels
  cursorContainerRef?: React.RefObject<HTMLDivElement | null>;
  cursorOffsetLeft?: number;
}

export function WaterfallTimeline({
  width,
  cursorContainerRef,
  cursorOffsetLeft = 0,
}: WaterfallTimelineProps) {
  const cursorDomRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [cursorContainerHeight, setCursorContainerHeight] = useState(0);

  // Calculate the actual timeline width
  const calculatedWidth = width || 800;

  useEffect(() => {
    const target = cursorContainerRef?.current ?? null;
    setPortalTarget(target);

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
    if (!portalTarget) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cursorDomRef.current) return;
      const rect = portalTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const relativeX = x - cursorOffsetLeft;
      const scrollLeft = portalTarget.scrollLeft || 0;
      const timelineX = relativeX + scrollLeft;
      const containerWidth = rect.width;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        // Check bounds against visible container width, not the full timeline width
        const inBounds = relativeX >= 0 && relativeX <= containerWidth;
        if (inBounds) {
          // Position cursor at absolute timeline position (accounts for scroll)
          cursorDomRef.current!.style.left = `${timelineX}px`;
          cursorDomRef.current!.style.display = 'block';
        } else {
          cursorDomRef.current!.style.display = 'none';
        }
        rafRef.current = null;
      });
    };

    const handleMouseLeave = () => {
      if (cursorDomRef.current) {
        cursorDomRef.current.style.display = 'none';
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    portalTarget.addEventListener('mousemove', handleMouseMove);
    portalTarget.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      portalTarget.removeEventListener('mousemove', handleMouseMove);
      portalTarget.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [calculatedWidth, portalTarget, cursorOffsetLeft]);

  return (
    <div className="waterfall-timeline-wrapper" style={{ position: 'relative' }}>
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
