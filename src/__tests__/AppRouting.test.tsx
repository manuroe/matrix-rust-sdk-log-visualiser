import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { useLogStore } from '../stores/logStore';

describe('App routing fallback', () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    useLogStore.getState().clearData();
    useLogStore.getState().clearLastRoute();
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  it('redirects to LandingPage when data is missing on deep link', async () => {
    window.location.hash = '#/logs';

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Drop Matrix SDK Log File Here/i)).toBeInTheDocument();
    });

    expect(useLogStore.getState().lastRoute).toBe('/logs');
  });
});
