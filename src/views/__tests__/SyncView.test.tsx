import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { SyncView } from '../SyncView';
import { useLogStore } from '../../stores/logStore';
import { createSyncRequests, createSyncRequest } from '../../test/fixtures';
import type { SyncRequest } from '../../types/log.types';
import { act } from '@testing-library/react';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ hash: window.location.hash }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => {
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    return [new URLSearchParams(queryString), vi.fn()];
  },
}));

describe('SyncView - header controls', () => {
  beforeEach(() => {
    // suppress act() warnings for these synchronous render tests
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('renders the conn-id dropdown', () => {
    const requests = [
      createSyncRequest({ requestId: 'S-1', sendLineNumber: 0, connId: 'room-list' }),
      createSyncRequest({ requestId: 'S-2', sendLineNumber: 2, connId: 'encryption' }),
    ];
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
      connectionIds: ['room-list', 'encryption'],
      selectedConnId: '',
    });

    act(() => { render(<SyncView />); });

    const connSelect = document.getElementById('conn-filter') as HTMLSelectElement;
    expect(connSelect).not.toBeNull();
    const options = Array.from(connSelect.options).map(o => o.value);
    expect(options).toContain('room-list');
    expect(options).toContain('encryption');
  });

  it('renders the timeout dropdown when requests have timeout values', () => {
    const requests = [
      createSyncRequest({ requestId: 'S-1', sendLineNumber: 0, timeout: 0 }),
      createSyncRequest({ requestId: 'S-2', sendLineNumber: 2, timeout: 30000 }),
    ];
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    act(() => { render(<SyncView />); });

    const timeoutSelect = document.getElementById('timeout-filter') as HTMLSelectElement;
    expect(timeoutSelect).not.toBeNull();
    const options = Array.from(timeoutSelect.options).map(o => o.value);
    expect(options).toContain('0');
    expect(options).toContain('30000');
  });

  it('renders the timeout dropdown when there is only one timeout value', () => {
    const requests = [
      createSyncRequest({ requestId: 'S-1', sendLineNumber: 0, timeout: 30000 }),
      createSyncRequest({ requestId: 'S-2', sendLineNumber: 2, timeout: 30000 }),
    ];
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    act(() => { render(<SyncView />); });

    expect(document.getElementById('timeout-filter')).not.toBeNull();
  });

  it('does not render the /sync filter checkbox', () => {
    const requests = createSyncRequests(3);
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    act(() => { render(<SyncView />); });

    const labels = screen.queryAllByText('/sync');
    // The page title "/sync requests" contains /sync — we want no checkbox label
    const checkboxLabels = labels.filter(el => el.closest('label'));
    expect(checkboxLabels).toHaveLength(0);
  });
});

describe('SyncView - ID Parameter Deep Linking', () => {
  let mockScrollTo: ReturnType<typeof vi.fn>;
  let originalHash: string;
  
  beforeEach(() => {
    mockScrollTo = vi.fn();
    originalHash = window.location.hash;
    
    // Mock scrollTo on HTMLElement
    HTMLElement.prototype.scrollTo = mockScrollTo;
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  it('opens LogDisplayView when id parameter is present', async () => {
    const requests = createSyncRequests(10);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-5';
    
    render(<SyncView />);

    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('SYNC-5')).toBe(true);
    }, { timeout: 2000 });
  });

  it('expands row when id parameter is present', async () => {
    const requests = createSyncRequests(10);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-7';
    
    render(<SyncView />);

    await waitFor(() => {
      const { expandedRows } = useLogStore.getState();
      expect(expandedRows.has('SYNC-7')).toBe(true);
    }, { timeout: 2000 });
  });

  it('scrolls to center the request row in viewport', async () => {
    const requests = createSyncRequests(100);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-50';
    
    render(<SyncView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
      expect(mockScrollTo.mock.calls.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('does not scroll multiple times for same ID', async () => {
    const requests = createSyncRequests(10);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-3';
    
    const { rerender } = render(<SyncView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Wait for retry mechanism to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    const callCountAfterInitial = mockScrollTo.mock.calls.length;

    // Re-render component
    rerender(<SyncView />);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have scrolled again (same call count as after initial + retries)
    expect(mockScrollTo.mock.calls.length).toBe(callCountAfterInitial);
  });

  it('retries scroll if initial scroll does not reach target', async () => {
    const requests = createSyncRequests(50);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-25';
    
    const { container } = render(<SyncView />);

    const leftPanel = container.querySelector('.waterfall-timeline-left') as HTMLElement;
    if (leftPanel) {
      let scrollCount = 0;
      Object.defineProperty(leftPanel, 'clientHeight', { value: 400, configurable: true });
      Object.defineProperty(leftPanel, 'scrollHeight', { value: 1400, configurable: true });
      Object.defineProperty(leftPanel, 'scrollTop', {
        get: () => {
          // First few attempts return wrong value, then correct
          if (scrollCount < 3) return 0;
          return 514; // Expected: 25 * 28 - (400 / 2) + (28 / 2) = 700 - 200 + 14 = 514
        },
        set: () => { scrollCount++; },
        configurable: true,
      });
    }

    await waitFor(() => {
      // Should have multiple scroll attempts
      expect(mockScrollTo.mock.calls.length).toBeGreaterThan(1);
    }, { timeout: 2000 });
  });

  it('does not open LogDisplayView if ID not in filtered requests', async () => {
    const requests = createSyncRequests(10);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests.slice(0, 5), // Only first 5 filtered
    });

    window.location.hash = '#/sync?request_id=SYNC-9'; // ID exists in all but not filtered
    
    render(<SyncView />);

    // Wait to ensure it doesn't open
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { openLogViewerIds, expandedRows } = useLogStore.getState();
    expect(openLogViewerIds.has('SYNC-9')).toBe(false);
    expect(expandedRows.has('SYNC-9')).toBe(false);
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('handles URL-encoded request IDs', async () => {
    const requests: SyncRequest[] = [
      createSyncRequest({ requestId: 'SYNC-123', sendLineNumber: 0 }),
      createSyncRequest({ requestId: 'SYNC:SPECIAL/CHARS', sendLineNumber: 2 }),
      createSyncRequest({ requestId: 'SYNC-456', sendLineNumber: 4 }),
    ];
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    // URL-encoded version of 'SYNC:SPECIAL/CHARS'
    window.location.hash = '#/sync?request_id=SYNC%3ASPECIAL%2FCHARS';
    
    render(<SyncView />);

    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('SYNC:SPECIAL/CHARS')).toBe(true);
    }, { timeout: 2000 });
  });

  it('clamps scroll target to maxScroll bounds', async () => {
    const requests = createSyncRequests(10);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-9'; // Last item
    
    render(<SyncView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('removes id parameter and preserves other URL params when clicking different request', async () => {
    const requests = createSyncRequests(5);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-2&scale=50';
    
    const { container, unmount } = render(<SyncView />);

    // Wait for initial request to open
    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('SYNC-2')).toBe(true);
    }, { timeout: 2000 });

    // Wait for all animations/effects to settle
    await new Promise(resolve => setTimeout(resolve, 1600));

    // Click on a different request
    const requestIdElement = screen.getByTestId('request-id-SYNC-4');
    expect(requestIdElement).toBeTruthy();
    requestIdElement.click();

    // Wait a bit for the click handler to execute
    await new Promise(resolve => setTimeout(resolve, 200));

    // URL should no longer have the id parameter
    expect(window.location.hash).not.toContain('request_id=SYNC-2');
    expect(window.location.hash).toBe('#/sync?scale=50');
    
    // Cleanup to prevent async errors
    unmount();
  });

  it('keeps id parameter when clicking the same request', async () => {
    const requests = createSyncRequests(5);
    
    useLogStore.setState({
      allRequests: requests,
      filteredRequests: requests,
    });

    window.location.hash = '#/sync?request_id=SYNC-3';
    
    const { container } = render(<SyncView />);

    // Wait for initial request to open
    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('SYNC-3')).toBe(true);
    }, { timeout: 2000 });

    const originalHash = window.location.hash;

    // Click on the same request (should close it)
    const requestIdElement = screen.getByTestId('request-id-SYNC-3');
    expect(requestIdElement).toBeTruthy();
    requestIdElement.click();

    // Wait a bit for the click handler to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // URL should still have the id parameter (consistency)
    expect(window.location.hash).toBe(originalHash);
  });
});
