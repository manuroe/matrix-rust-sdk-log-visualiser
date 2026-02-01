import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';
import { useLogStore } from '../../stores/logStore';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockParseLogFile = vi.fn();

const mockParseAllHttpRequests = vi.fn();

vi.mock('../../utils/logParser', () => ({
  parseLogFile: (content: string) => mockParseLogFile(content),
  parseAllHttpRequests: (content: string) => mockParseAllHttpRequests(content),
}));

class MockFileReader {
  public result: string | null = null;
  public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  public onerror: (() => void) | null = null;

  readAsText() {
    this.result = 'mock log content';
    if (this.onload) {
      this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
    }
  }
}

describe('FileUpload navigation', () => {
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    useLogStore.getState().clearData();
    useLogStore.getState().clearLastRoute();
    mockNavigate.mockReset();
    mockParseLogFile.mockReset();
    mockParseAllHttpRequests.mockReset();

    vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);

    mockParseLogFile.mockReturnValue({
      requests: [],
      connectionIds: [],
      rawLogLines: [
        {
          lineNumber: 0,
          rawText: 'line 0',
          timestamp: new Date(0).toISOString(),
          level: 'INFO',
          message: 'line 0',
        },
      ],
    });
    mockParseAllHttpRequests.mockReturnValue({ httpRequests: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.FileReader = originalFileReader;
  });

  it('navigates to last route after upload when available', () => {
    useLogStore.setState({ lastRoute: '/http_requests?id=REQ-1' });

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.log', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockNavigate).toHaveBeenCalledWith('/http_requests?id=REQ-1');
  });

  it('falls back to /summary when last route is empty', () => {
    useLogStore.setState({ lastRoute: null });

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.log', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockNavigate).toHaveBeenCalledWith('/summary');
  });
});
