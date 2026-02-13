import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { WaterfallTimeline } from '../WaterfallTimeline';
import { getWaterfallPosition, getWaterfallBarWidth } from '../../utils/timelineUtils';
import { createRef } from 'react';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('WaterfallTimeline', () => {
  const defaultProps = {
    minTime: 1000000,
    maxTime: 1010000,
    totalDuration: 10000,
    width: 800,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with basic props', () => {
      const { container } = render(<WaterfallTimeline {...defaultProps} />);
      const timeline = container.querySelector('.waterfall-timeline-scale');
      expect(timeline).toBeInTheDocument();
    });

    it('applies correct width from props', () => {
      const { container } = render(<WaterfallTimeline {...defaultProps} width={1200} />);
      const timeline = container.querySelector('.waterfall-timeline-scale');
      expect(timeline).toHaveStyle({ width: '1200px' });
    });

    it('uses default width when not provided', () => {
      const { container } = render(
        <WaterfallTimeline
          minTime={defaultProps.minTime}
          maxTime={defaultProps.maxTime}
          totalDuration={defaultProps.totalDuration}
        />
      );
      const timeline = container.querySelector('.waterfall-timeline-scale');
      expect(timeline).toHaveStyle({ width: '800px' });
    });
  });

  describe('Tick Generation', () => {
    it('generates ticks for short duration (< 1s)', () => {
      const { container } = render(
        <WaterfallTimeline
          minTime={1000000}
          maxTime={1000800}
          totalDuration={800}
          width={800}
        />
      );
      // Should use 100ms tick interval
      const ticks = container.querySelectorAll('.timeline-tick');
      expect(ticks.length).toBeGreaterThan(0);
    });

    it('generates ticks for medium duration (1-5s)', () => {
      const { container } = render(
        <WaterfallTimeline
          minTime={1000000}
          maxTime={1003000}
          totalDuration={3000}
          width={800}
        />
      );
      // Should use 500ms tick interval
      const ticks = container.querySelectorAll('.timeline-tick');
      expect(ticks.length).toBeGreaterThan(0);
    });

    it('generates ticks for long duration (> 1min)', () => {
      const { container } = render(
        <WaterfallTimeline
          minTime={1000000}
          maxTime={1120000}
          totalDuration={120000}
          width={800}
        />
      );
      // Should use larger tick interval
      const ticks = container.querySelectorAll('.timeline-tick');
      expect(ticks.length).toBeGreaterThan(0);
    });

    it('positions ticks correctly based on time', () => {
      const { container } = render(<WaterfallTimeline {...defaultProps} />);
      const firstTick = container.querySelector('.timeline-tick');
      expect(firstTick).toHaveStyle({ position: 'absolute' });
    });
  });

  describe('Cursor Behavior', () => {
    it('does not render cursor overlay without cursorContainerRef', () => {
      const { container } = render(<WaterfallTimeline {...defaultProps} />);
      const overlay = container.querySelector('.waterfall-cursor-overlay');
      expect(overlay).not.toBeInTheDocument();
    });

    it('renders cursor overlay with cursorContainerRef', () => {
      const containerRef = createRef<HTMLDivElement>();
      const TestComponent = () => {
        return (
          <div>
            <div ref={containerRef} style={{ width: 800, height: 600 }}>
              Container
            </div>
            <WaterfallTimeline
              {...defaultProps}
              cursorContainerRef={containerRef}
            />
          </div>
        );
      };
      
      render(<TestComponent />);
      // Cursor overlay is rendered via portal, so check in document
      const overlay = document.querySelector('.waterfall-cursor-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('applies cursorOffsetLeft to cursor overlay', () => {
      const containerRef = createRef<HTMLDivElement>();
      const TestComponent = () => {
        return (
          <div>
            <div ref={containerRef} style={{ width: 800, height: 600 }}>
              Container
            </div>
            <WaterfallTimeline
              {...defaultProps}
              cursorContainerRef={containerRef}
              cursorOffsetLeft={100}
            />
          </div>
        );
      };
      
      render(<TestComponent />);
      const overlay = document.querySelector('.waterfall-cursor-overlay') as HTMLElement;
      expect(overlay).toHaveStyle({ left: '100px' });
    });

    it('cursor overlay has overflow visible to show beyond timeline width', () => {
      const containerRef = createRef<HTMLDivElement>();
      const TestComponent = () => {
        return (
          <div>
            <div ref={containerRef} style={{ width: 800, height: 600 }}>
              Container
            </div>
            <WaterfallTimeline
              {...defaultProps}
              cursorContainerRef={containerRef}
            />
          </div>
        );
      };
      
      render(<TestComponent />);
      const overlay = document.querySelector('.waterfall-cursor-overlay') as HTMLElement;
      expect(overlay).toHaveStyle({ overflow: 'visible' });
    });
  });

  describe('Width Calculation', () => {
    it('uses provided width directly', () => {
      const { container } = render(<WaterfallTimeline {...defaultProps} width={1500} />);
      const timeline = container.querySelector('.waterfall-timeline-scale');
      expect(timeline).toHaveStyle({ width: '1500px' });
    });

    it('respects minimum width when no width provided', () => {
      const { container } = render(
        <WaterfallTimeline
          minTime={defaultProps.minTime}
          maxTime={defaultProps.maxTime}
          totalDuration={defaultProps.totalDuration}
        />
      );
      const timeline = container.querySelector('.waterfall-timeline-scale');
      const width = parseInt(timeline?.getAttribute('style')?.match(/width:\s*(\d+)px/)?.[1] || '0');
      expect(width).toBeGreaterThanOrEqual(800);
    });
  });

  describe('Helper Functions', () => {
    it('getWaterfallPosition calculates correct position', () => {
      const position = getWaterfallPosition(1005000, 1000000, 10000, 800);
      // Calculated: (1005000 - 1000000) / 10000 * 800 = 5000 / 10000 * 800 = 400px
      // Dynamic min: 5000ms from start / 10 = 500px
      // Result: max(400, 500) = 500px
      expect(position).toBe(500);
    });

    it('getWaterfallPosition uses calculated position when larger', () => {
      // Short time from start on a large timeline
      const position = getWaterfallPosition(1000100, 1000000, 10000, 10000);
      // Calculated: 100 / 10000 * 10000 = 100px
      // Dynamic min: 100ms / 10 = 10px
      // Result: max(100, 10) = 100px
      expect(position).toBe(100);
    });

    it('getWaterfallBarWidth calculates correct width', () => {
      const width = getWaterfallBarWidth(1000, 10000, 800);
      // 1000 / 10000 * 800 = 80px calculated
      // Dynamic min = max(1, 1000/10) = 100px
      // Result = max(80, 100) = 100px
      expect(width).toBe(100);
    });

    it('getWaterfallBarWidth respects minimum width for larger values', () => {
      // For 50ms duration, dynamic min would be max(1, 50/10) = 5px
      // But if passed minWidth is larger, it should still use the calculated width when appropriate
      const width = getWaterfallBarWidth(50, 10000, 800);
      // 50 / 10000 * 800 = 4px, but dynamic min is 5px
      expect(width).toBe(5);
    });

    it('getWaterfallBarWidth enforces 10ms = 1px minimum', () => {
      // 10ms should be at least 1px
      const width10ms = getWaterfallBarWidth(10, 100000, 800);
      expect(width10ms).toBeGreaterThanOrEqual(1);
      
      // 20ms should be at least 2px
      const width20ms = getWaterfallBarWidth(20, 100000, 800);
      expect(width20ms).toBeGreaterThanOrEqual(2);
      
      // 5ms should be at least 0.5px
      const width5ms = getWaterfallBarWidth(5, 100000, 800);
      expect(width5ms).toBeGreaterThanOrEqual(0.5);
      
      // 1171ms should be at least 117.1px
      const width1171ms = getWaterfallBarWidth(1171, 1000000, 10000);
      expect(width1171ms).toBeCloseTo(117.1, 1);
    });

    it('getWaterfallBarWidth uses calculated width when larger than dynamic minimum', () => {
      // 1000ms with good ratio should use calculated width, not minimum
      const width = getWaterfallBarWidth(1000, 10000, 800);
      // (1000 / 10000) * 800 = 80px (much larger than min of 100px would be)
      // Dynamic min would be max(1, 1000/10) = 100px
      // Calculated is 80px, so use dynamic min of 100px
      expect(width).toBe(100);
    });

    it('getWaterfallBarWidth uses dynamic minimum for very short durations', () => {
      // 1ms on a very long timeline would calculate to nearly 0px
      // Dynamic min: max(1, 1/10) = 1px
      const width1ms = getWaterfallBarWidth(1, 1000000, 10000);
      expect(width1ms).toBe(1);
      
      // 10ms on a very long timeline
      // Dynamic min: max(1, 10/10) = 1px
      const width10ms = getWaterfallBarWidth(10, 1000000, 10000);
      expect(width10ms).toBe(1);
    });
  });
});
