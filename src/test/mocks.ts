/**
 * Shared mock implementations for tests.
 * Import and call these functions at the top of test files that need them.
 */
import { vi } from 'vitest';

/**
 * Mock @tanstack/react-virtual's useVirtualizer hook.
 * Returns a simple implementation that renders all items without virtualization.
 *
 * Usage at top of test file:
 * ```ts
 * import { mockVirtualizer } from '../../test/mocks';
 * mockVirtualizer();
 * ```
 */
export function mockVirtualizer(): void {
  vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: (opts: { count: number }) => ({
      getTotalSize: () => opts.count * 24,
      getVirtualItems: () =>
        Array.from({ length: opts.count }, (_, i) => ({
          index: i,
          key: i,
          start: i * 24,
        })),
      measureElement: () => {},
      measure: () => {},
      measurementsCache: [],
    }),
  }));
}

export interface RouterMockConfig {
  /** Search params to return from useSearchParams (default: empty) */
  searchParams?: URLSearchParams;
  /** Hash value for useLocation (default: '') */
  hash?: string;
  /** Mock navigate function (default: vi.fn()) */
  navigate?: ReturnType<typeof vi.fn>;
}

/**
 * Mock react-router-dom with configurable behavior.
 *
 * Usage at top of test file:
 * ```ts
 * import { mockReactRouterDom } from '../../test/mocks';
 * const mockNavigate = vi.fn();
 * mockReactRouterDom({ navigate: mockNavigate, hash: '#/http_requests?id=REQ-1' });
 * ```
 */
export function mockReactRouterDom(config: RouterMockConfig = {}): void {
  const {
    searchParams = new URLSearchParams(),
    hash = '',
    navigate = vi.fn(),
  } = config;

  vi.mock('react-router-dom', () => ({
    useSearchParams: () => [searchParams, vi.fn()],
    useLocation: () => ({ hash }),
    useNavigate: () => navigate,
  }));
}
