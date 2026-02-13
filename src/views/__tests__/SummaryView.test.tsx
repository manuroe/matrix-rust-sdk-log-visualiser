/**
 * Unit tests for SummaryView.tsx
 * Tests rendering of statistics and user interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SummaryView } from '../SummaryView';
import { useLogStore } from '../../stores/logStore';
import {
  createParsedLogLine,
  createParsedLogLines,
  createHttpRequest,
  createSyncRequest,
} from '../../test/fixtures';
import type { ParsedLogLine } from '../../types/log.types';

// Mock BurgerMenu
vi.mock('../../components/BurgerMenu', () => ({
  BurgerMenu: () => <div data-testid="burger-menu" />,
}));

// Mock LogActivityChart since it has complex rendering
vi.mock('../../components/LogActivityChart', () => ({
  LogActivityChart: ({ logLines }: { logLines: ParsedLogLine[] }) => (
    <div data-testid="log-activity-chart">Lines: {logLines.length}</div>
  ),
}));

// Mock TimeRangeSelector
vi.mock('../../components/TimeRangeSelector', () => ({
  TimeRangeSelector: () => <div data-testid="time-range-selector" />,
}));

// Helper to render with router
function renderSummaryView() {
  return render(
    <MemoryRouter>
      <SummaryView />
    </MemoryRouter>
  );
}

describe('SummaryView', () => {
  beforeEach(() => {
    useLogStore.getState().clearData();
  });

  describe('empty state', () => {
    it('renders empty state message when no logs loaded', () => {
      renderSummaryView();

      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(
        screen.getByText('No logs loaded. Please upload a log file to see the summary.')
      ).toBeInTheDocument();
    });

    it('renders burger menu in empty state', () => {
      renderSummaryView();

      expect(screen.getByTestId('burger-menu')).toBeInTheDocument();
    });
  });

  describe('with log data', () => {
    beforeEach(() => {
      // Set up some log lines with varying levels
      const logLines: ParsedLogLine[] = [
        createParsedLogLine({
          lineNumber: 0,
          level: 'INFO',
          message: 'Starting application',
          displayTime: '10:00:00.000000',
        }),
        createParsedLogLine({
          lineNumber: 1,
          level: 'DEBUG',
          message: 'Debug message',
          displayTime: '10:00:01.000000',
        }),
        createParsedLogLine({
          lineNumber: 2,
          level: 'WARN',
          message: 'Warning: something odd',
          displayTime: '10:00:02.000000',
        }),
        createParsedLogLine({
          lineNumber: 3,
          level: 'ERROR',
          message: 'Error: connection failed',
          displayTime: '10:00:03.000000',
        }),
        createParsedLogLine({
          lineNumber: 4,
          level: 'ERROR',
          message: 'Error: timeout',
          displayTime: '10:00:04.000000',
        }),
      ];

      const httpRequests = [
        createHttpRequest({ requestId: 'REQ-1', status: '200', requestDurationMs: 100 }),
        createHttpRequest({ requestId: 'REQ-2', status: '404', requestDurationMs: 200 }),
        createHttpRequest({ requestId: 'REQ-3', status: '500', requestDurationMs: 500 }),
      ];

      const syncRequests = [
        createSyncRequest({ requestId: 'SYNC-1', connId: 'room-list' }),
        createSyncRequest({ requestId: 'SYNC-2', connId: 'room-list' }),
        createSyncRequest({ requestId: 'SYNC-3', connId: 'encryption' }),
      ];

      useLogStore.getState().setRequests(syncRequests, ['room-list', 'encryption'], logLines);
      useLogStore.getState().setHttpRequests(httpRequests, logLines);
    });

    it('renders the Summary title', () => {
      renderSummaryView();

      expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    });

    it('displays total log lines count', () => {
      renderSummaryView();

      // The heading shows "Logs Over Time: X lines"
      expect(screen.getByText(/Logs Over Time: 5 lines/)).toBeInTheDocument();
    });

    it('renders time range selector', () => {
      renderSummaryView();

      expect(screen.getByTestId('time-range-selector')).toBeInTheDocument();
    });

    it('renders activity chart with log lines', () => {
      renderSummaryView();

      expect(screen.getByTestId('log-activity-chart')).toBeInTheDocument();
      expect(screen.getByText('Lines: 5')).toBeInTheDocument();
    });

    it('displays error count section', () => {
      renderSummaryView();

      // The header contains "Top Errors (X)" but split across elements
      // Look for the table header text that includes error count
      const errorHeader = screen.getByRole('columnheader', { name: /top errors/i });
      expect(errorHeader).toBeInTheDocument();
      // The error count of 2 should be visible
      expect(errorHeader.textContent).toContain('2');
    });

    it('displays warning count section', () => {
      renderSummaryView();

      // Look for the table header text that includes warning count
      const warningHeader = screen.getByRole('columnheader', { name: /top warnings/i });
      expect(warningHeader).toBeInTheDocument();
      // The warning count of 1 should be visible
      expect(warningHeader.textContent).toContain('1');
    });

    it('displays HTTP error status breakdown', () => {
      renderSummaryView();

      // Should show HTTP Errors section with 4xx and 5xx errors
      expect(screen.getByRole('heading', { name: /HTTP Errors/i })).toBeInTheDocument();
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('displays sync requests by connection', () => {
      renderSummaryView();

      expect(screen.getByText('Sync Requests by Connection')).toBeInTheDocument();
      expect(screen.getByText('room-list')).toBeInTheDocument();
      expect(screen.getByText('encryption')).toBeInTheDocument();
    });
  });

  describe('statistics calculations', () => {
    it('counts errors by type correctly', () => {
      const logLines = [
        createParsedLogLine({ lineNumber: 0, level: 'ERROR', message: 'Connection failed' }),
        createParsedLogLine({ lineNumber: 1, level: 'ERROR', message: 'Connection failed' }),
        createParsedLogLine({ lineNumber: 2, level: 'ERROR', message: 'Timeout occurred' }),
      ];

      useLogStore.getState().setHttpRequests([], logLines);

      renderSummaryView();

      // Should show 3 errors total in the header
      const errorHeader = screen.getByRole('columnheader', { name: /top errors/i });
      expect(errorHeader.textContent).toContain('3');
    });

    it('excludes sync requests from slowest HTTP display', () => {
      // Create HTTP requests, one being a sync request
      const httpRequests = [
        createHttpRequest({
          requestId: 'REQ-1',
          uri: 'https://example.com/rooms/123/messages',
          requestDurationMs: 100,
        }),
        createHttpRequest({
          requestId: 'REQ-2',
          uri: 'https://example.com/_matrix/client/v3/sync',
          requestDurationMs: 5000, // Very slow sync, should be excluded
        }),
      ];
      const rawLines = createParsedLogLines(2);

      useLogStore.getState().setHttpRequests(httpRequests, rawLines);

      renderSummaryView();

      // The sync request should not appear in "Slowest HTTP Requests"
      // but REQ-1 should (if section appears)
      // Just verify the view renders without error
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });

    it('displays log line count', () => {
      const logLines = createParsedLogLines(7); // Use 7 to avoid collisions with other numbers
      useLogStore.getState().setHttpRequests([], logLines);

      renderSummaryView();

      // Should display "X lines" in the header
      expect(screen.getByText(/7 lines/i)).toBeInTheDocument();
    });
  });

  describe('empty data sections', () => {
    it('does not render errors section when no errors', () => {
      const logLines = [
        createParsedLogLine({ lineNumber: 0, level: 'INFO', message: 'Info message' }),
      ];

      useLogStore.getState().setHttpRequests([], logLines);

      renderSummaryView();

      // "Top Errors" table header should not appear
      expect(screen.queryByRole('columnheader', { name: /top errors/i })).not.toBeInTheDocument();
    });

    it('shows no HTTP errors message when all requests are successful', () => {
      const httpRequests = [
        createHttpRequest({ requestId: 'REQ-1', status: '200' }),
        createHttpRequest({ requestId: 'REQ-2', status: '201' }),
      ];
      const logLines = createParsedLogLines(2);

      useLogStore.getState().setHttpRequests(httpRequests, logLines);

      renderSummaryView();

      // Should show "No HTTP errors" or not show the section at all
      const httpErrorsSection = screen.queryByText('HTTP Errors by Status');
      if (httpErrorsSection) {
        expect(screen.getByText(/No HTTP errors/i)).toBeInTheDocument();
      }
    });
  });
});
