import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { BurgerMenu } from '../BurgerMenu';
import { useLogStore } from '../../stores/logStore';

// Track navigation calls
const navigateMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [currentSearchParams, vi.fn()],
  };
});

describe('BurgerMenu', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    currentSearchParams = new URLSearchParams();
    useLogStore.getState().clearData();
  });

  describe('Cross-View Navigation Param Preservation', () => {
    it('preserves start and end params when navigating to another view', () => {
      currentSearchParams = new URLSearchParams('start=2025-01-01T00:00:00Z&end=2025-01-01T12:00:00Z');

      render(
        <MemoryRouter initialEntries={['/http_requests?start=2025-01-01T00:00:00Z&end=2025-01-01T12:00:00Z']}>
          <BurgerMenu />
        </MemoryRouter>
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: /menu/i }));

      // Click on "All Logs"
      fireEvent.click(screen.getByText('All Logs'));

      expect(navigateMock).toHaveBeenCalledWith(
        '/logs?start=2025-01-01T00%3A00%3A00Z&end=2025-01-01T12%3A00%3A00Z'
      );
    });

    it('clears view-specific params (scale, status, filter, request_id) when navigating', () => {
      currentSearchParams = new URLSearchParams(
        'start=2025-01-01T00:00:00Z&end=2025-01-01T12:00:00Z&scale=50&status=200,500&filter=sync&request_id=REQ-1'
      );

      render(
        <MemoryRouter initialEntries={['/http_requests']}>
          <BurgerMenu />
        </MemoryRouter>
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: /menu/i }));

      // Click on "Summary"
      fireEvent.click(screen.getByText('Summary'));

      // Should only have start and end, not scale/status/filter/request_id
      const navigatedPath = navigateMock.mock.calls[0][0];
      expect(navigatedPath).toContain('start=');
      expect(navigatedPath).toContain('end=');
      expect(navigatedPath).not.toContain('scale=');
      expect(navigatedPath).not.toContain('status=');
      expect(navigatedPath).not.toContain('filter=');
      expect(navigatedPath).not.toContain('request_id=');
    });

    it('navigates without params when no start/end present', () => {
      currentSearchParams = new URLSearchParams('scale=50&filter=sync');

      render(
        <MemoryRouter initialEntries={['/http_requests']}>
          <BurgerMenu />
        </MemoryRouter>
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: /menu/i }));

      // Click on "All Logs"
      fireEvent.click(screen.getByText('All Logs'));

      // Should navigate to plain path without query string
      expect(navigateMock).toHaveBeenCalledWith('/logs');
    });

    it('preserves only start when end is not present', () => {
      currentSearchParams = new URLSearchParams('start=last-hour&filter=sync');

      render(
        <MemoryRouter initialEntries={['/http_requests']}>
          <BurgerMenu />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /menu/i }));
      fireEvent.click(screen.getByText('Summary'));

      expect(navigateMock).toHaveBeenCalledWith('/summary?start=last-hour');
    });

    it('preserves only end when start is not present', () => {
      currentSearchParams = new URLSearchParams('end=2025-01-01T12:00:00Z&status=500');

      render(
        <MemoryRouter initialEntries={['/http_requests']}>
          <BurgerMenu />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /menu/i }));
      fireEvent.click(screen.getByText('HTTP Requests'));

      expect(navigateMock).toHaveBeenCalledWith(
        '/http_requests?end=2025-01-01T12%3A00%3A00Z'
      );
    });
  });

  describe('Menu Behavior', () => {
    it('closes menu after navigation', () => {
      render(
        <MemoryRouter>
          <BurgerMenu />
        </MemoryRouter>
      );

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: /menu/i }));
      expect(screen.getByText('Summary')).toBeInTheDocument();

      // Navigate
      fireEvent.click(screen.getByText('Summary'));

      // Menu should be closed (dropdown no longer visible)
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });
  });
});
