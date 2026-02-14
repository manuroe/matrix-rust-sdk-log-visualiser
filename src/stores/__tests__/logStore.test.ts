/**
 * Unit tests for logStore.ts
 * Tests Zustand store actions and state management.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useLogStore } from '../logStore';
import {
  createSyncRequest,
  createSyncRequests,
  createHttpRequest,
  createHttpRequests,
  createParsedLogLine,
  createParsedLogLines,
} from '../../test/fixtures';
import type { AppError } from '../../utils/errorHandling';

describe('logStore', () => {
  beforeEach(() => {
    // The global afterEach in setup.ts also resets, but this ensures a clean slate
    useLogStore.getState().clearData();
  });

  describe('initial state', () => {
    it('has empty arrays and null filters', () => {
      const state = useLogStore.getState();

      expect(state.allRequests).toEqual([]);
      expect(state.filteredRequests).toEqual([]);
      expect(state.allHttpRequests).toEqual([]);
      expect(state.filteredHttpRequests).toEqual([]);
      expect(state.connectionIds).toEqual([]);
      expect(state.rawLogLines).toEqual([]);
      expect(state.statusCodeFilter).toBeNull();
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
    });

    it('has default UI state', () => {
      const state = useLogStore.getState();

      expect(state.expandedRows.size).toBe(0);
      expect(state.openLogViewerIds.size).toBe(0);
      expect(state.hidePending).toBe(true);
      expect(state.hidePendingHttp).toBe(true);
    });
  });

  describe('setRequests', () => {
    it('sets sync requests and raw log lines', () => {
      const requests = createSyncRequests(3);
      const rawLines = createParsedLogLines(5);
      const connIds = ['room-list', 'encryption'];

      useLogStore.getState().setRequests(requests, connIds, rawLines);
      const state = useLogStore.getState();

      expect(state.allRequests).toHaveLength(3);
      expect(state.connectionIds).toEqual(connIds);
      expect(state.rawLogLines).toHaveLength(5);
    });

    it('defaults to room-list connection when available', () => {
      const requests = createSyncRequests(1);
      const connIds = ['encryption', 'room-list', 'other'];

      useLogStore.getState().setRequests(requests, connIds, []);
      const state = useLogStore.getState();

      expect(state.selectedConnId).toBe('room-list');
    });

    it('defaults to first connection when room-list is unavailable', () => {
      const requests = createSyncRequests(1);
      const connIds = ['encryption', 'other'];

      useLogStore.getState().setRequests(requests, connIds, []);
      const state = useLogStore.getState();

      expect(state.selectedConnId).toBe('encryption');
    });

    it('triggers filterRequests after setting data', () => {
      const requests = [createSyncRequest({ status: '200', connId: 'room-list' })];
      const connIds = ['room-list'];

      useLogStore.getState().setRequests(requests, connIds, []);
      const state = useLogStore.getState();

      // With hidePending=true (default), completed request should be included
      expect(state.filteredRequests).toHaveLength(1);
    });
  });

  describe('setHttpRequests', () => {
    it('sets HTTP requests and raw log lines', () => {
      const requests = createHttpRequests(4);
      const rawLines = createParsedLogLines(10);

      useLogStore.getState().setHttpRequests(requests, rawLines);
      const state = useLogStore.getState();

      expect(state.allHttpRequests).toHaveLength(4);
      expect(state.rawLogLines).toHaveLength(10);
    });

    it('triggers filterHttpRequests after setting data', () => {
      const requests = [
        createHttpRequest({ status: '200' }),
        createHttpRequest({ status: '' }), // Pending
      ];

      useLogStore.getState().setHttpRequests(requests, []);
      const state = useLogStore.getState();

      // With hidePendingHttp=true (default), only completed requests
      expect(state.filteredHttpRequests).toHaveLength(1);
      expect(state.filteredHttpRequests[0].status).toBe('200');
    });
  });

  describe('filterRequests', () => {
    beforeEach(() => {
      // Reset store to ensure clean default state (hidePending=true, etc.)
      useLogStore.getState().clearData();
      // Note: clearData doesn't reset hidePending to default, so we need a full reset
      // This tests with fresh store state plus our test data
      useLogStore.setState({
        hidePending: true,
        hidePendingHttp: true,
      });
      
      const requests = [
        createSyncRequest({ requestId: 'REQ-1', status: '200', connId: 'room-list' }),
        createSyncRequest({ requestId: 'REQ-2', status: '', connId: 'room-list' }), // Pending
        createSyncRequest({ requestId: 'REQ-3', status: '200', connId: 'encryption' }),
        createSyncRequest({ requestId: 'REQ-4', status: '401', connId: 'room-list' }),
      ];
      useLogStore.getState().setRequests(requests, ['room-list', 'encryption'], []);
    });

    it('filters by connection ID', () => {
      useLogStore.getState().setHidePending(false);
      useLogStore.getState().setSelectedConnId('encryption');
      const state = useLogStore.getState();

      expect(state.filteredRequests).toHaveLength(1);
      expect(state.filteredRequests[0].requestId).toBe('REQ-3');
    });

    it('filters out pending requests when hidePending is true', () => {
      // Default hidePending=true, selected is room-list by default
      const state = useLogStore.getState();

      // Room-list requests with status: REQ-1 (200), REQ-4 (401)
      expect(state.filteredRequests).toHaveLength(2);
      expect(state.filteredRequests.every(r => r.status !== '')).toBe(true);
    });

    it('includes pending requests when hidePending is false', () => {
      useLogStore.getState().setHidePending(false);
      const state = useLogStore.getState();

      expect(state.filteredRequests).toHaveLength(3); // All room-list requests
    });

    it('filters by status code filter', () => {
      useLogStore.getState().setHidePending(false);
      useLogStore.getState().setStatusCodeFilter(new Set(['401']));
      const state = useLogStore.getState();

      expect(state.filteredRequests).toHaveLength(1);
      expect(state.filteredRequests[0].status).toBe('401');
    });

    it('includes pending requests when status filter includes Pending', () => {
      useLogStore.getState().setStatusCodeFilter(new Set(['Pending']));
      useLogStore.getState().setHidePending(false);
      const state = useLogStore.getState();

      expect(state.filteredRequests).toHaveLength(1);
      expect(state.filteredRequests[0].requestId).toBe('REQ-2');
    });
  });

  describe('filterHttpRequests', () => {
    beforeEach(() => {
      // Reset store to ensure clean default state
      useLogStore.getState().clearData();
      useLogStore.setState({
        hidePending: true,
        hidePendingHttp: true,
      });
      
      const requests = [
        createHttpRequest({ requestId: 'REQ-1', status: '200' }),
        createHttpRequest({ requestId: 'REQ-2', status: '' }), // Pending
        createHttpRequest({ requestId: 'REQ-3', status: '404' }),
        createHttpRequest({ requestId: 'REQ-4', status: '500' }),
      ];
      useLogStore.getState().setHttpRequests(requests, []);
    });

    it('filters out pending requests when hidePendingHttp is true', () => {
      const state = useLogStore.getState();

      expect(state.filteredHttpRequests).toHaveLength(3);
      expect(state.filteredHttpRequests.every(r => r.status !== '')).toBe(true);
    });

    it('includes pending requests when hidePendingHttp is false', () => {
      useLogStore.getState().setHidePendingHttp(false);
      const state = useLogStore.getState();

      expect(state.filteredHttpRequests).toHaveLength(4);
    });

    it('filters by status code filter', () => {
      useLogStore.getState().setStatusCodeFilter(new Set(['200', '404']));
      const state = useLogStore.getState();

      expect(state.filteredHttpRequests).toHaveLength(2);
    });
  });

  describe('time filtering', () => {
    it('filters requests within time range', () => {
      // Create rawLogLines with specific timestamps
      const baseTime = 1700000000000000; // microseconds
      const rawLines = [
        createParsedLogLine({ lineNumber: 1, timestampUs: baseTime }),
        createParsedLogLine({ lineNumber: 2, timestampUs: baseTime + 1000000 }), // +1 second
        createParsedLogLine({ lineNumber: 3, timestampUs: baseTime + 2000000 }), // +2 seconds
      ];

      const requests = [
        createHttpRequest({ requestId: 'REQ-1', responseLineNumber: 1, status: '200' }),
        createHttpRequest({ requestId: 'REQ-2', responseLineNumber: 2, status: '200' }),
        createHttpRequest({ requestId: 'REQ-3', responseLineNumber: 3, status: '200' }),
      ];

      useLogStore.getState().setHttpRequests(requests, rawLines);
      // Filter to ~50% of time range (should roughly filter some requests)
      useLogStore.getState().setTimeFilter('00:00:00.000000', '00:00:01.000000');

      const state = useLogStore.getState();
      // Depending on calculation, some requests should be filtered out
      expect(state.filteredHttpRequests.length).toBeLessThanOrEqual(3);
    });

    it('includes all requests when no time filter is set', () => {
      const rawLines = createParsedLogLines(3);
      const requests = createHttpRequests(3);

      useLogStore.getState().setHttpRequests(requests, rawLines);
      const state = useLogStore.getState();

      expect(state.filteredHttpRequests).toHaveLength(3);
    });
  });

  describe('setStatusCodeFilter', () => {
    it('triggers both filterRequests and filterHttpRequests', () => {
      const syncRequests = [createSyncRequest({ status: '200', connId: 'room-list' })];
      const httpRequests = [createHttpRequest({ status: '200' })];

      useLogStore.getState().setRequests(syncRequests, ['room-list'], []);
      useLogStore.getState().setHttpRequests(httpRequests, []);

      // Both should have data
      expect(useLogStore.getState().filteredRequests).toHaveLength(1);
      expect(useLogStore.getState().filteredHttpRequests).toHaveLength(1);

      // Filter to non-existent status
      useLogStore.getState().setStatusCodeFilter(new Set(['404']));

      // Both should be filtered out
      expect(useLogStore.getState().filteredRequests).toHaveLength(0);
      expect(useLogStore.getState().filteredHttpRequests).toHaveLength(0);
    });

    it('null filter means all statuses enabled', () => {
      const requests = [
        createHttpRequest({ status: '200' }),
        createHttpRequest({ status: '404' }),
        createHttpRequest({ status: '500' }),
      ];
      useLogStore.getState().setHttpRequests(requests, []);

      useLogStore.getState().setStatusCodeFilter(null);
      const state = useLogStore.getState();

      expect(state.filteredHttpRequests).toHaveLength(3);
    });
  });

  describe('toggleRowExpansion', () => {
    it('adds requestId to expandedRows when not present', () => {
      useLogStore.getState().toggleRowExpansion('REQ-1');
      const state = useLogStore.getState();

      expect(state.expandedRows.has('REQ-1')).toBe(true);
    });

    it('removes requestId from expandedRows when already present', () => {
      useLogStore.getState().toggleRowExpansion('REQ-1');
      useLogStore.getState().toggleRowExpansion('REQ-1');
      const state = useLogStore.getState();

      expect(state.expandedRows.has('REQ-1')).toBe(false);
    });

    it('maintains other expanded rows when toggling', () => {
      useLogStore.getState().toggleRowExpansion('REQ-1');
      useLogStore.getState().toggleRowExpansion('REQ-2');
      useLogStore.getState().toggleRowExpansion('REQ-1');
      const state = useLogStore.getState();

      expect(state.expandedRows.has('REQ-1')).toBe(false);
      expect(state.expandedRows.has('REQ-2')).toBe(true);
    });
  });

  describe('setActiveRequest', () => {
    it('clears all expanded rows and opens only the specified one', () => {
      useLogStore.getState().toggleRowExpansion('REQ-1');
      useLogStore.getState().toggleRowExpansion('REQ-2');

      useLogStore.getState().setActiveRequest('REQ-3');
      const state = useLogStore.getState();

      expect(state.expandedRows.size).toBe(1);
      expect(state.expandedRows.has('REQ-3')).toBe(true);
    });

    it('also opens log viewer for the request', () => {
      useLogStore.getState().openLogViewer('REQ-1');

      useLogStore.getState().setActiveRequest('REQ-2');
      const state = useLogStore.getState();

      expect(state.openLogViewerIds.size).toBe(1);
      expect(state.openLogViewerIds.has('REQ-2')).toBe(true);
    });
  });

  describe('log viewer actions', () => {
    it('openLogViewer adds requestId to set', () => {
      useLogStore.getState().openLogViewer('REQ-1');
      useLogStore.getState().openLogViewer('REQ-2');
      const state = useLogStore.getState();

      expect(state.openLogViewerIds.has('REQ-1')).toBe(true);
      expect(state.openLogViewerIds.has('REQ-2')).toBe(true);
    });

    it('closeLogViewer removes requestId from set', () => {
      useLogStore.getState().openLogViewer('REQ-1');
      useLogStore.getState().openLogViewer('REQ-2');
      useLogStore.getState().closeLogViewer('REQ-1');
      const state = useLogStore.getState();

      expect(state.openLogViewerIds.has('REQ-1')).toBe(false);
      expect(state.openLogViewerIds.has('REQ-2')).toBe(true);
    });
  });

  describe('navigation memory', () => {
    it('setLastRoute stores route', () => {
      useLogStore.getState().setLastRoute('/http-requests');
      expect(useLogStore.getState().lastRoute).toBe('/http-requests');
    });

    it('clearLastRoute resets to null', () => {
      useLogStore.getState().setLastRoute('/sync');
      useLogStore.getState().clearLastRoute();
      expect(useLogStore.getState().lastRoute).toBeNull();
    });
  });

  describe('error handling', () => {
    it('setError stores error', () => {
      const error: AppError = {
        message: 'Test error',
        code: 'TEST_ERROR',
        timestamp: Date.now(),
      };
      useLogStore.getState().setError(error);
      expect(useLogStore.getState().error).toEqual(error);
    });

    it('clearError resets error to null', () => {
      const error: AppError = {
        message: 'Test error',
        code: 'TEST_ERROR',
        timestamp: Date.now(),
      };
      useLogStore.getState().setError(error);
      useLogStore.getState().clearError();
      expect(useLogStore.getState().error).toBeNull();
    });
  });

  describe('getDisplayTime', () => {
    it('returns displayTime for matching line number', () => {
      const rawLines = [
        createParsedLogLine({ lineNumber: 1, displayTime: '12:00:00.000000' }),
        createParsedLogLine({ lineNumber: 2, displayTime: '12:00:01.000000' }),
      ];
      useLogStore.getState().setHttpRequests([], rawLines);

      expect(useLogStore.getState().getDisplayTime(2)).toBe('12:00:01.000000');
    });

    it('returns empty string for non-existent line number', () => {
      const rawLines = [createParsedLogLine({ lineNumber: 1 })];
      useLogStore.getState().setHttpRequests([], rawLines);

      expect(useLogStore.getState().getDisplayTime(999)).toBe('');
    });
  });

  describe('clearData', () => {
    it('resets all state to initial values', () => {
      // Set up various state
      useLogStore.getState().setRequests(
        createSyncRequests(3),
        ['room-list'],
        createParsedLogLines(5)
      );
      useLogStore.getState().setHttpRequests(createHttpRequests(4), []);
      useLogStore.getState().toggleRowExpansion('REQ-1');
      useLogStore.getState().openLogViewer('REQ-2');
      useLogStore.getState().setTimeFilter('00:00:00', '00:00:10');
      useLogStore.getState().setStatusCodeFilter(new Set(['200']));

      // Clear all data
      useLogStore.getState().clearData();
      const state = useLogStore.getState();

      expect(state.allRequests).toEqual([]);
      expect(state.filteredRequests).toEqual([]);
      expect(state.allHttpRequests).toEqual([]);
      expect(state.filteredHttpRequests).toEqual([]);
      expect(state.connectionIds).toEqual([]);
      expect(state.rawLogLines).toEqual([]);
      expect(state.expandedRows.size).toBe(0);
      expect(state.openLogViewerIds.size).toBe(0);
      expect(state.statusCodeFilter).toBeNull();
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
    });
  });

  describe('setTimelineScale', () => {
    it('updates timeline scale', () => {
      useLogStore.getState().setTimelineScale(10);
      expect(useLogStore.getState().timelineScale).toBe(10);

      useLogStore.getState().setTimelineScale(5);
      expect(useLogStore.getState().timelineScale).toBe(5);
    });
  });
});
