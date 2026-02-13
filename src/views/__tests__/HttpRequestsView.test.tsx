import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HttpRequestsView } from '../HttpRequestsView';
import { useLogStore } from '../../stores/logStore';
import { createHttpRequests, createHttpRequest } from '../../test/fixtures';
import type { HttpRequest } from '../../types/log.types';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ hash: '' }),
  useNavigate: () => vi.fn(),
}));

describe('HttpRequestsView - ID Parameter Deep Linking', () => {
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
    const requests = createHttpRequests(10);
    
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
    const requests = createHttpRequests(10);
    
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
    const requests = createHttpRequests(100);
    
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
    const requests = createHttpRequests(10);
    
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
    const requests = createHttpRequests(50);
    
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
    const requests = createHttpRequests(10);
    
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
      createHttpRequest({ requestId: 'REQ-123', sendLineNumber: 0 }),
      createHttpRequest({ requestId: 'REQ:SPECIAL/CHARS', sendLineNumber: 2 }),
      createHttpRequest({ requestId: 'REQ-456', sendLineNumber: 4 }),
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
    const requests = createHttpRequests(10);
    
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
    const requests = createHttpRequests(5);
    
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
    const requests = createHttpRequests(5);
    
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
