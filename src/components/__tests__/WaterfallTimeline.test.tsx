import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders wrapper element', () => {
      const { container } = render(<WaterfallTimeline />);
      const wrapper = container.querySelector('.waterfall-timeline-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders with width prop', () => {
      const { container } = render(<WaterfallTimeline width={1200} />);
      const wrapper = container.querySelector('.waterfall-timeline-wrapper');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Cursor Behavior', () => {
    it('does not render cursor overlay without cursorContainerRef', () => {
      const { container } = render(<WaterfallTimeline />);
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

    it('getWaterfallBarWidth uses dynamic minimum when calculated width is smaller', () => {
      // 1000ms with this ratio: calculated = (1000/10000)*800 = 80px
      // Dynamic min = max(1, 1000/10) = 100px
      // Calculated (80px) < dynamic min (100px) → dynamic min wins.
      const width = getWaterfallBarWidth(1000, 10000, 800);
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

  describe('Mouse Events', () => {
    let rafCallback: FrameRequestCallback | null = null;

    beforeEach(() => {
      rafCallback = null;
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        rafCallback = cb;
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('shows cursor at correct position on mousemove in bounds', () => {
      const containerRef = createRef<HTMLDivElement>();
      const { container } = render(
        <div>
          <div ref={containerRef} style={{ width: 800, height: 600 }}>
            Container
          </div>
          <WaterfallTimeline cursorContainerRef={containerRef} cursorOffsetLeft={0} />
        </div>
      );

      const containerEl = containerRef.current!;
      vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 600,
        width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
      });

      act(() => {
        const event = new MouseEvent('mousemove', { clientX: 300, clientY: 100, bubbles: true });
        containerEl.dispatchEvent(event);
        // Execute RAF callback
        if (rafCallback) rafCallback(0);
      });

      const cursor = document.querySelector('.waterfall-cursor-line') as HTMLElement;
      expect(cursor).toBeInTheDocument();
      expect(cursor.style.display).toBe('block');
      expect(cursor.style.left).toBe('300px');
    });

    it('hides cursor when mousemove is out of bounds', () => {
      const containerRef = createRef<HTMLDivElement>();
      render(
        <div>
          <div ref={containerRef} style={{ width: 800, height: 600 }}>
            Container
          </div>
          <WaterfallTimeline cursorContainerRef={containerRef} cursorOffsetLeft={0} />
        </div>
      );

      const containerEl = containerRef.current!;
      vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
        left: 100, top: 0, right: 900, bottom: 600,
        width: 800, height: 600, x: 100, y: 0, toJSON: () => {},
      });

      act(() => {
        // clientX: 50 → relativeX = 50 - 100 = -50, out of bounds
        const event = new MouseEvent('mousemove', { clientX: 50, clientY: 100, bubbles: true });
        containerEl.dispatchEvent(event);
        if (rafCallback) rafCallback(0);
      });

      const cursor = document.querySelector('.waterfall-cursor-line') as HTMLElement;
      expect(cursor).not.toBeNull();
      expect(cursor.style.display).toBe('none');
    });

    it('hides cursor on mouseleave', () => {
      const containerRef = createRef<HTMLDivElement>();
      render(
        <div>
          <div ref={containerRef} style={{ width: 800, height: 600 }}>
            Container
          </div>
          <WaterfallTimeline cursorContainerRef={containerRef} />
        </div>
      );

      const containerEl = containerRef.current!;

      act(() => {
        const event = new MouseEvent('mouseleave', { bubbles: true });
        containerEl.dispatchEvent(event);
      });

      const cursor = document.querySelector('.waterfall-cursor-line') as HTMLElement;
      expect(cursor).not.toBeNull();
      expect(cursor.style.display).toBe('none');
    });

    it('cancels pending RAF on rapid mousemove', () => {
      const cancelRAF = vi.fn();
      vi.stubGlobal('cancelAnimationFrame', cancelRAF);

      // First RAF returns id=1, second returns id=2
      let rafId = 0;
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        rafCallback = cb;
        return ++rafId;
      });

      const containerRef = createRef<HTMLDivElement>();
      render(
        <div>
          <div ref={containerRef} style={{ width: 800, height: 600 }}>
            Container
          </div>
          <WaterfallTimeline cursorContainerRef={containerRef} />
        </div>
      );

      const containerEl = containerRef.current!;
      vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 600,
        width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
      });

      act(() => {
        // First mousemove queues RAF (id=1), don't execute it
        containerEl.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
        // Second mousemove should cancel RAF id=1 and queue a new one
        containerEl.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 100, bubbles: true }));
      });

      expect(cancelRAF).toHaveBeenCalledWith(1);
    });

    it('accounts for cursorOffsetLeft in cursor positioning', () => {
      const containerRef = createRef<HTMLDivElement>();
      render(
        <div>
          <div ref={containerRef} style={{ width: 800, height: 600 }}>
            Container
          </div>
          <WaterfallTimeline cursorContainerRef={containerRef} cursorOffsetLeft={50} />
        </div>
      );

      const containerEl = containerRef.current!;
      vi.spyOn(containerEl, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 600,
        width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
      });

      act(() => {
        // clientX: 300, relativeX = 300 - 50 = 250 (in bounds), timelineX = 250 + scroll(0) = 250
        containerEl.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 100, bubbles: true }));
        if (rafCallback) rafCallback(0);
      });

      const cursor = document.querySelector('.waterfall-cursor-line') as HTMLElement;
      expect(cursor).not.toBeNull();
      expect(cursor.style.left).toBe('250px');
    });
  });
});
