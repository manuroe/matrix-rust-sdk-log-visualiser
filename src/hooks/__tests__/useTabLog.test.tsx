/**
 * Unit tests for the useTabLog hook.
 *
 * The hook is a no-op when the `tabLog` param is absent, and otherwise reads
 * log text from localStorage, parses it, loads it into the store, and removes
 * the param from the URL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// vi.mock factories are hoisted above imports, so declare mock fns via vi.hoisted().
const {
  mockLoadAndClearTabLog,
  mockParseLogFile,
  mockLoadLogParserResult,
} = vi.hoisted(() => ({
  mockLoadAndClearTabLog: vi.fn<(uuid: string) => string | null>(),
  mockParseLogFile: vi.fn(),
  mockLoadLogParserResult: vi.fn(),
}));

vi.mock('../../utils/tabLogUtils', () => ({
  loadAndClearTabLog: mockLoadAndClearTabLog,
}));

vi.mock('../../utils/logParser', () => ({
  parseLogFile: mockParseLogFile,
}));

vi.mock('../../stores/logStore', () => ({
  useLogStore: Object.assign(
    (selector: (state: { loadLogParserResult: typeof mockLoadLogParserResult }) => unknown) =>
      selector({ loadLogParserResult: mockLoadLogParserResult }),
    { getState: () => ({ clearData: vi.fn(), loadLogParserResult: mockLoadLogParserResult }) },
  ),
}));

import { useTabLog } from '../useTabLog';

/** Build a test wrapper that places the hook inside a React Router context at the given URL. */
function createWrapper(initialEntry = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

const FAKE_UUID = '00000000-0000-0000-0000-000000000001';
const PARSED_RESULT = { rawLogLines: [], allRequests: [], allHttpRequests: [] };

describe('useTabLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseLogFile.mockReturnValue(PARSED_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('is a no-op when the tabLog param is absent', () => {
    renderHook(() => useTabLog(), { wrapper: createWrapper('/') });
    expect(mockLoadAndClearTabLog).not.toHaveBeenCalled();
    expect(mockParseLogFile).not.toHaveBeenCalled();
    expect(mockLoadLogParserResult).not.toHaveBeenCalled();
  });

  it('loads and parses log text when tabLog param and localStorage entry are present', async () => {
    const logText = 'some log content';
    mockLoadAndClearTabLog.mockReturnValue(logText);

    renderHook(() => useTabLog(), {
      wrapper: createWrapper(`/?tabLog=${FAKE_UUID}`),
    });

    await waitFor(() => {
      expect(mockLoadAndClearTabLog).toHaveBeenCalledWith(FAKE_UUID);
      expect(mockParseLogFile).toHaveBeenCalledWith(logText);
      expect(mockLoadLogParserResult).toHaveBeenCalledWith(PARSED_RESULT);
    });
  });

  it('silently ignores a missing or stale localStorage entry (loadAndClearTabLog returns null)', async () => {
    mockLoadAndClearTabLog.mockReturnValue(null);

    renderHook(() => useTabLog(), {
      wrapper: createWrapper(`/?tabLog=${FAKE_UUID}`),
    });

    await waitFor(() => {
      expect(mockLoadAndClearTabLog).toHaveBeenCalledWith(FAKE_UUID);
    });

    // Should not attempt to parse or load into the store when the text is absent.
    expect(mockParseLogFile).not.toHaveBeenCalled();
    expect(mockLoadLogParserResult).not.toHaveBeenCalled();
  });
});
