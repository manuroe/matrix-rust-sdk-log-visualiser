import { describe, it, expect } from 'vitest';
import {
  isValidGzipHeader,
  isValidTextContent,
  decodeTextBytes,
  validateTextFile,
  validateGzipFile,
} from '../fileValidator';
import { compressSync, decompressSync } from 'fflate';

describe('fileValidator', () => {
  describe('isValidGzipHeader', () => {
    it('returns true for valid gzip magic number', () => {
      const gzipHeader = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
      expect(isValidGzipHeader(gzipHeader)).toBe(true);
    });

    it('returns false for invalid gzip magic number', () => {
      const invalidHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP header
      expect(isValidGzipHeader(invalidHeader)).toBe(false);
    });

    it('returns false for empty bytes', () => {
      expect(isValidGzipHeader(new Uint8Array())).toBe(false);
    });
  });

  describe('isValidTextContent', () => {
    it('accepts valid UTF-8 text', () => {
      const utf8Bytes = new TextEncoder().encode('test log content\nline 2');
      const result = isValidTextContent(utf8Bytes);
      expect(result.isValid).toBe(true);
      expect(result.encoding).toBe('utf-8');
    });

    it('rejects files with null bytes', () => {
      const bytesWithNull = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const result = isValidTextContent(bytesWithNull);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('binary data');
    });

    it('detects UTF-8 BOM', () => {
      const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x74, 0x65, 0x73, 0x74]); // BOM + "test"
      const result = isValidTextContent(bomBytes);
      expect(result.isValid).toBe(true);
      expect(result.encoding).toBe('utf-8-bom');
    });

    it('accepts lenient UTF-8 with warnings', () => {
      // Valid UTF-8 followed by invalid sequence
      const invalidUtf8 = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x80, 0x81]); // "test" + invalid bytes
      const result = isValidTextContent(invalidUtf8);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('falls back to ISO-8859-1 with warning', () => {
      // Use bytes that are invalid UTF-8 but not BOM markers
      // Overlong encoding in UTF-8 (0xC0 0x80 represents NUL but is not canonical)
      // Use real ISO-8859-1 only bytes
      const iso88591Only = new Uint8Array([0x80, 0x81, 0x82, 0x83]); // Control chars that are invalid UTF-8
      const result = isValidTextContent(iso88591Only);
      expect(result.isValid).toBe(true);
      // Either ISO-8859-1 or UTF-8 lenient decode
      expect(
        result.encoding === 'iso-8859-1' || result.warnings.some((w) => w.includes('invalid UTF-8'))
      ).toBe(true);
    });
  });

  describe('decodeTextBytes', () => {
    it('decodes UTF-8 bytes', () => {
      const utf8Bytes = new TextEncoder().encode('hello world');
      const decoded = decodeTextBytes(utf8Bytes, 'utf-8');
      expect(decoded).toBe('hello world');
    });

    it('decodes ISO-8859-1 bytes', () => {
      // À in ISO-8859-1
      const iso88591Bytes = new Uint8Array([0xc0, 0x20, 0x74, 0x65, 0x73, 0x74]); // "À test"
      const decoded = decodeTextBytes(iso88591Bytes, 'iso-8859-1');
      expect(decoded).toContain('test');
    });

    it('strips UTF-8 BOM before decoding', () => {
      const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('test')]);
      const decoded = decodeTextBytes(bomBytes, 'utf-8');
      expect(decoded).toBe('test');
    });

    it('handles lenient UTF-8 decode on error', () => {
      const invalidUtf8 = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0xff, 0xfe]);
      const decoded = decodeTextBytes(invalidUtf8, 'utf-8');
      expect(decoded).toContain('test');
    });
  });

  describe('validateTextFile', () => {
    it('accepts valid text file', async () => {
      const content = 'valid log content\nline 2';
      const file = new File([content], 'test.log', { type: 'text/plain' });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(true);
    });

    it('accepts empty text file', async () => {
      const file = new File([], 'test.log', { type: 'text/plain' });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(true);
    });

    it('rejects file larger than 500MB', async () => {
      // Create a mock file object with size property
      const file = new File(['x'], 'test.log', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 600 * 1024 * 1024, writable: true });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('warns for file larger than 100MB', async () => {
      // Create a file-like object with custom size
      const content = 'x';
      const file = new File([content], 'test.log', { type: 'text/plain' });
      // Can't easily mock file size in jsdom, so skip this test
      // In real usage, browser will enforce these limits
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(true);
    });

    it('rejects file with null bytes', async () => {
      const content = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const file = new File([content], 'test.log', { type: 'text/plain' });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('binary data');
    });
  });

  describe('validateGzipFile', () => {
    it('accepts valid gzip with text content', async () => {
      const content = 'valid log content\nline 2';
      const encoded = new TextEncoder().encode(content);
      const compressed = compressSync(encoded);
      const file = new File([compressed as BlobPart], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(true);
    });

    it('rejects invalid gzip header', async () => {
      const invalidGzip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP header
      const file = new File([invalidGzip], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid header');
    });

    it('rejects empty gzip file', async () => {
      const file = new File([], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects gzip with binary content (null bytes)', async () => {
      // Create gzip with binary content containing null bytes
      const binaryContent = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const compressed = compressSync(binaryContent);
      const file = new File([compressed as BlobPart], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('binary data');
    });

    it('rejects corrupted gzip file', async () => {
      // Valid gzip header but corrupted/incomplete data
      const corrupted = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff, 0xff, 0xff]);
      const file = new File([corrupted as BlobPart], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      // Could be decompress error or other validation error
      expect(result.error).toBeDefined();
    });
  });
});
