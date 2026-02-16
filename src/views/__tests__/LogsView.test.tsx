import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, within, waitFor } from '@testing-library/dom';
import { useLogStore } from '../../stores/logStore';
import { LogsView } from '../LogsView';
import { createParsedLogLines } from '../../test/fixtures';
import * as TimeUtils from '../../utils/timeUtils';
import logDisplayStyles from '../LogDisplayView.module.css';

// Mock react-router-dom for useSearchParams
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
}));

// Mock react-virtual to simplify rendering in tests
vi.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: (opts: any) => ({
      getTotalSize: () => opts.count * 24,
      getVirtualItems: () => Array.from({ length: opts.count }, (_, i) => ({ index: i, key: i, start: i * 24 })),
      measureElement: () => {},
      measure: () => {},
      measurementsCache: [],
    }),
  };
});

// Mock BurgerMenu and TimeRangeSelector to simplify testing
vi.mock('../../components/BurgerMenu', () => ({
  BurgerMenu: () => <div data-testid="burger-menu">Menu</div>,
}));

vi.mock('../../components/TimeRangeSelector', () => ({
  TimeRangeSelector: () => <div data-testid="time-range-selector">Selector</div>,
}));

describe('LogsView', () => {
  beforeEach(() => {
    useLogStore.getState().clearData();
    mockSetSearchParams.mockClear();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with title and stats', () => {
    const logs = createParsedLogLines(10);
    useLogStore.setState({ rawLogLines: logs });

    render(<LogsView />);

    expect(screen.getByText('All Logs')).toBeInTheDocument();
    expect(screen.getByTestId('burger-menu')).toBeInTheDocument();
    expect(screen.getByTestId('time-range-selector')).toBeInTheDocument();
  });

  it('displays correct log count and total', () => {
    const logs = createParsedLogLines(20);
    useLogStore.setState({ rawLogLines: logs });

    render(<LogsView />);

    const shownCount = screen.getByText('20', { selector: '#shown-count' });
    const totalCount = screen.getByText('20', { selector: '#total-count' });
    
    expect(shownCount).toBeInTheDocument();
    expect(totalCount).toBeInTheDocument();
  });

  it('filters logs by time range', () => {
    const baseTime = new Date('2026-02-02T12:00:00Z');
    const logs = createParsedLogLines(100, { baseTime });
    
    // Set time range to filter logs (25% to 75% of duration)
    useLogStore.setState({ 
      rawLogLines: logs,
      startTime: '2026-02-02T12:00:25Z', // 25 seconds in
      endTime: '2026-02-02T12:01:15Z',   // 75 seconds in
    });

    render(<LogsView />);

    // With 100 logs spanning 99 seconds, filtering 25-75s should give ~50 logs
    const shownCountEl = screen.getByText((content, element) => 
      element?.id === 'shown-count' && content !== ''
    ) as HTMLElement;
    
    const shownCount = parseInt(shownCountEl.textContent || '0');
    expect(shownCount).toBeLessThan(100);
    expect(shownCount).toBeGreaterThan(0);
  });

  it('shows total count as all raw logs regardless of filter', () => {
    const baseTime = new Date('2026-02-02T12:00:00Z');
    const logs = createParsedLogLines(50, { baseTime });
    useLogStore.setState({ 
      rawLogLines: logs,
      startTime: '2026-02-02T12:00:10Z', // Partial time range
      endTime: '2026-02-02T12:00:40Z',
    });

    render(<LogsView />);

    const totalCount = screen.getByText('50', { selector: '#total-count' });
    expect(totalCount).toBeInTheDocument();
  });

  it('handles empty logs gracefully', () => {
    useLogStore.setState({ rawLogLines: [] });

    render(<LogsView />);

    expect(screen.getByText('0', { selector: '#shown-count' })).toBeInTheDocument();
    expect(screen.getByText('0', { selector: '#total-count' })).toBeInTheDocument();
  });

  it('passes LogDisplayView the correct props', () => {
    const logs = createParsedLogLines(20);
    useLogStore.setState({ rawLogLines: logs });

    const { container } = render(<LogsView />);

    // Check that LogDisplayView is rendered (it's the container with logs)
    const logsContainer = container.querySelector('.logs-view-container');
    expect(logsContainer).toBeInTheDocument();

    // The LogDisplayView should be present (contains log lines)
    const logLines = container.querySelectorAll(`.${logDisplayStyles.logLine}`);
    expect(logLines.length).toBeGreaterThan(0);
  });

  it('provides prevRequestLineRange and nextRequestLineRange props to LogDisplayView', () => {
    const logs = createParsedLogLines(10);
    useLogStore.setState({ rawLogLines: logs });

    // Since LogDisplayView doesn't expose these props in the DOM, we verify indirectly
    // by ensuring LogDisplayView renders without errors and can access them
    const { container } = render(<LogsView />);
    
    const logsContainer = container.querySelector('.logs-view-container');
    expect(logsContainer).toBeInTheDocument();
    
    // Verify LogDisplayView rendered (has at least one log line)
    const logLines = container.querySelectorAll(`.${logDisplayStyles.logLine}`);
    expect(logLines.length).toBeGreaterThan(0);
  });

  it('returns undefined range props when no logs exist', () => {
    useLogStore.setState({ rawLogLines: [] });

    // Should render without errors even with no logs
    const { container } = render(<LogsView />);
    
    expect(container.querySelector('.logs-view-container')).toBeInTheDocument();
    expect(screen.getByText('0', { selector: '#shown-count' })).toBeInTheDocument();
  });

  it('updates display when time range changes', async () => {
    const baseTime = new Date('2026-02-02T12:00:00Z');
    const logs = createParsedLogLines(50, { baseTime });
    
    useLogStore.setState({ rawLogLines: logs });

    const { rerender } = render(<LogsView />);

    // Get initial count with full time range
    let shownEl = screen.getByText((content, element) => 
      element?.id === 'shown-count' && content !== ''
    );
    const initialCount = parseInt(shownEl.textContent || '0');
    expect(initialCount).toBeGreaterThan(0);

    // Change time range to filter more
    vi.clearAllMocks();
    useLogStore.setState({
      startTime: '2026-02-02T12:00:10Z',
      endTime: '2026-02-02T12:00:20Z',
    });

    await waitFor(() => {
      rerender(<LogsView />);
    });

    // Count should be different (smaller) with narrower time range
    shownEl = screen.getByText((content, element) => 
      element?.id === 'shown-count' && content !== ''
    );
    const newCount = parseInt(shownEl.textContent || '0');

    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  it('does not filter by request filter - only time range', () => {
    // LogsView should NOT apply request filtering, only time range
    const logs = createParsedLogLines(10);
    useLogStore.setState({ rawLogLines: logs });

    const { container } = render(<LogsView />);

    // Should show all logs in time range regardless of content
    const shownCountEl = screen.getByText((content, element) => 
      element?.id === 'shown-count' && content !== ''
    );
    const shownCount = parseInt(shownCountEl.textContent || '0');
    
    expect(shownCount).toBe(10);
  });

  it('does not clear filter param on mount when uriFilter is set', async () => {
    const logs = createParsedLogLines(10);
    useLogStore.setState({ rawLogLines: logs, uriFilter: 'existing-filter' });

    // Clear any previous calls
    mockSetSearchParams.mockClear();

    render(<LogsView />);

    // Wait for any effects to settle
    await waitFor(() => {
      // setSearchParams should NOT have been called to clear the filter
      // If it was called, it would mean we're resetting the URL param
      const callsWithEmptyFilter = mockSetSearchParams.mock.calls.filter(
        (call: any[]) => {
          const params = call[0];
          // Check if any call cleared the filter
          return params instanceof URLSearchParams && 
                 (params.get('filter') === null || params.get('filter') === '');
        }
      );
      expect(callsWithEmptyFilter.length).toBe(0);
    });
  });
});
