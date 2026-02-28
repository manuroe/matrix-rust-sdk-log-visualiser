import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Auto-reset logStore after each test to ensure test isolation
afterEach(async () => {
  // Dynamic import to avoid circular dependencies during setup
  const { useLogStore } = await import('../stores/logStore');
  useLogStore.getState().clearData();
  vi.clearAllMocks();
});

// Optional: mock matchMedia if used
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView for tests
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
