import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { compressSync } from 'fflate';
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

describe('FileUpload navigation', () => {
  beforeEach(() => {
    useLogStore.getState().clearData();
    useLogStore.getState().clearLastRoute();
    mockNavigate.mockReset();
    mockParseLogFile.mockReset();
    mockParseAllHttpRequests.mockReset();

    mockParseLogFile.mockReturnValue({
      requests: [],
      connectionIds: [],
      rawLogLines: [
        {
          lineNumber: 0,
          rawText: 'line 0',
          isoTimestamp: '1970-01-01T00:00:00.000000Z',
          timestampUs: 0,
          displayTime: '00:00:00.000000',
          level: 'INFO',
          message: 'line 0',
          strippedMessage: 'line 0',
        },
      ],
    });
    mockParseAllHttpRequests.mockReturnValue({ httpRequests: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to last route after upload when available', async () => {
    useLogStore.setState({ lastRoute: '/http_requests?id=REQ-1' });

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.log', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/http_requests?id=REQ-1');
        resolve();
      }, 100);
    });
  });

  it('falls back to /summary when last route is empty', async () => {
    useLogStore.setState({ lastRoute: null });

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.log', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/summary');
        resolve();
      }, 100);
    });
  });

  it('decompresses .log.gz files and parses content', async () => {
    useLogStore.setState({ lastRoute: '/summary' });

    const logContent = 'test log line 1\ntest log line 2';
    const compressedData = compressSync(new TextEncoder().encode(logContent));

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File([compressedData as BlobPart], 'test.log.gz', { type: 'application/gzip' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockParseLogFile).toHaveBeenCalledWith(logContent);
        expect(mockParseAllHttpRequests).toHaveBeenCalledWith(logContent);
        expect(mockNavigate).toHaveBeenCalledWith('/summary');
        resolve();
      }, 100);
    });
  });

  it('accepts .gz files by MIME type', async () => {
    useLogStore.setState({ lastRoute: null });

    const logContent = 'test log content';
    const compressedData = compressSync(new TextEncoder().encode(logContent));

    const { container } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;
    const file = new File([compressedData as BlobPart], 'archive.gz', { type: 'application/gzip' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockParseLogFile).toHaveBeenCalledWith(logContent);
        expect(mockNavigate).toHaveBeenCalledWith('/summary');
        resolve();
      }, 100);
    });
  });

  it('rejects gzip files with binary content', async () => {
    const { container, rerender } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;

    // Create gzip with binary content (null bytes)
    const binaryContent = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
    const compressedData = compressSync(binaryContent);
    const file = new File([compressedData as BlobPart], 'test.log.gz', { type: 'application/gzip' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        rerender(<FileUpload />);
        expect(mockNavigate).not.toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });

  it('rejects plain text files with binary content', async () => {
    const { container, rerender } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;

    // Binary content with null bytes
    const binaryContent = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
    const file = new File([binaryContent], 'test.log', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        rerender(<FileUpload />);
        expect(mockNavigate).not.toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });

  it('rejects invalid gzip files', async () => {
    const { container, rerender } = render(<FileUpload />);
    const input = container.querySelector('#file-input') as HTMLInputElement;

    // ZIP file header (not gzip)
    const invalidGzip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const file = new File([invalidGzip], 'test.log.gz', { type: 'application/gzip' });

    fireEvent.change(input, { target: { files: [file] } });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        rerender(<FileUpload />);
        expect(mockNavigate).not.toHaveBeenCalled();
        resolve();
      }, 150);
    });
  });
});
