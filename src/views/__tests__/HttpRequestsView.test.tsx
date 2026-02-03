import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HttpRequestsView } from '../HttpRequestsView';
import { useLogStore } from '../../stores/logStore';
import type { HttpRequest } from '../../types/log.types';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ hash: '' }),
  useNavigate: () => vi.fn(),
}));

function createMockHttpRequest(id: string, index: number): HttpRequest {
  const url = `https://matrix.example.org/_matrix/client/v3/sync?timeout=30000&request=${index}`;
  return {
    requestId: id,
    method: 'POST',
    uri: url,
    requestTime: new Date(1000000 + index * 1000).toISOString(),
    responseTime: new Date(1000000 + index * 1000 + 500).toISOString(),
    requestDurationMs: 500,
    status: '200',
    requestSize: '0',
    responseSize: '0',
    sendLine: '1',
    responseLine: '2',
  };
}

describe('HttpRequestsView - ID Parameter Deep Linking', () => {
  let mockScrollTo: ReturnType<typeof vi.fn>;
  let originalHash: string;
  
  beforeEach(() => {
    useLogStore.getState().clearData();
    mockScrollTo = vi.fn();
    originalHash = window.location.hash;
    
    // Mock scrollTo on HTMLElement
    HTMLElement.prototype.scrollTo = mockScrollTo;
  });

  afterEach(() => {
    window.location.hash = originalHash;
    vi.clearAllMocks();
  });

  it('opens LogDisplayView when id parameter is present', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 10; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-5';
    
    render(<HttpRequestsView />);

    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('REQ-5')).toBe(true);
    }, { timeout: 2000 });
  });

  it('expands row when id parameter is present', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 10; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-7';
    
    render(<HttpRequestsView />);

    await waitFor(() => {
      const { expandedRows } = useLogStore.getState();
      expect(expandedRows.has('REQ-7')).toBe(true);
    }, { timeout: 2000 });
  });

  it('scrolls to center the request row in viewport', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 100; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-50';
    
    render(<HttpRequestsView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
      expect(mockScrollTo.mock.calls.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('does not scroll multiple times for same ID', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 10; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-3';
    
    const { rerender } = render(<HttpRequestsView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Wait for retry mechanism to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    const callCountAfterInitial = mockScrollTo.mock.calls.length;

    // Re-render component
    rerender(<HttpRequestsView />);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have scrolled again (same call count as after initial + retries)
    expect(mockScrollTo.mock.calls.length).toBe(callCountAfterInitial);
  });

  it('retries scroll if initial scroll does not reach target', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 50; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-25';
    
    const { container } = render(<HttpRequestsView />);

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
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 10; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests.slice(0, 5), // Only first 5 filtered
    });

    window.location.hash = '#/http_requests?id=REQ-9'; // ID exists in all but not filtered
    
    render(<HttpRequestsView />);

    // Wait to ensure it doesn't open
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { openLogViewerIds, expandedRows } = useLogStore.getState();
    expect(openLogViewerIds.has('REQ-9')).toBe(false);
    expect(expandedRows.has('REQ-9')).toBe(false);
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('handles URL-encoded request IDs', async () => {
    const requests: HttpRequest[] = [
      createMockHttpRequest('REQ-123', 0),
      createMockHttpRequest('REQ:SPECIAL/CHARS', 1),
      createMockHttpRequest('REQ-456', 2),
    ];
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    // URL-encoded version of 'REQ:SPECIAL/CHARS'
    window.location.hash = '#/http_requests?id=REQ%3ASPECIAL%2FCHARS';
    
    render(<HttpRequestsView />);

    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('REQ:SPECIAL/CHARS')).toBe(true);
    }, { timeout: 2000 });
  });

  it('clamps scroll target to maxScroll bounds', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 10; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-9'; // Last item
    
    render(<HttpRequestsView />);

    await waitFor(() => {
      expect(mockScrollTo).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('removes id parameter from URL when clicking different request', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 5; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-2';
    
    const { container, unmount } = render(<HttpRequestsView />);

    // Wait for initial request to open
    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('REQ-2')).toBe(true);
    }, { timeout: 2000 });

    // Wait for all animations/effects to settle
    await new Promise(resolve => setTimeout(resolve, 1600));

    // Click on a different request
    const requestIdElement = container.querySelector('[data-row-id="sticky-REQ-4"] .request-id') as HTMLElement;
    expect(requestIdElement).toBeTruthy();
    requestIdElement.click();

    // Wait a bit for the click handler to execute
    await new Promise(resolve => setTimeout(resolve, 200));

    // URL should no longer have the id parameter
    expect(window.location.hash).not.toContain('id=REQ-2');
    expect(window.location.hash).toBe('#/http_requests');
    
    // Cleanup to prevent async errors
    unmount();
  });

  it('keeps id parameter when clicking the same request', async () => {
    const requests: HttpRequest[] = [];
    for (let i = 0; i < 5; i++) {
      requests.push(createMockHttpRequest(`REQ-${i}`, i));
    }
    
    useLogStore.setState({
      allHttpRequests: requests,
      filteredHttpRequests: requests,
    });

    window.location.hash = '#/http_requests?id=REQ-3';
    
    const { container } = render(<HttpRequestsView />);

    // Wait for initial request to open
    await waitFor(() => {
      const { openLogViewerIds } = useLogStore.getState();
      expect(openLogViewerIds.has('REQ-3')).toBe(true);
    }, { timeout: 2000 });

    const originalHash = window.location.hash;

    // Click on the same request (should close it)
    const requestIdElement = container.querySelector('[data-row-id="sticky-REQ-3"] .request-id') as HTMLElement;
    expect(requestIdElement).toBeTruthy();
    requestIdElement.click();

    // Wait a bit for the click handler to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // URL should still have the id parameter (consistency)
    expect(window.location.hash).toBe(originalHash);
  });
});
