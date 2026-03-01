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
      expect(result.errors).toHaveLength(0);
    });

    it('rejects files with null bytes', () => {
      const bytesWithNull = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const result = isValidTextContent(bytesWithNull);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('detects UTF-8 BOM', () => {
      const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x74, 0x65, 0x73, 0x74]); // BOM + "test"
      const result = isValidTextContent(bomBytes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts lenient UTF-8 with warnings', () => {
      // Valid UTF-8 followed by invalid sequence
      const invalidUtf8 = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x80, 0x81]); // "test" + invalid bytes
      const result = isValidTextContent(invalidUtf8);
      expect(result.isValid).toBe(true);
      // Must emit a warning about encoding issues — not silently swallow the problem
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => /encoding issues/i.test(w.userMessage))).toBe(true);
    });

    it('falls back to lenient UTF-8 (not ISO-8859-1) for bytes invalid in strict mode', () => {
      // Bytes 0x80-0x83 are continuation bytes with no lead byte: invalid strict UTF-8,
      // but TextDecoder('utf-8', { fatal: false }) replaces them with U+FFFD, so the
      // lenient UTF-8 path succeeds. The ISO-8859-1 fallback is therefore unreachable
      // for this input — which is correct: the file is still valid, just with repair.
      const iso88591Only = new Uint8Array([0x80, 0x81, 0x82, 0x83]); // Control chars that are invalid UTF-8
      const result = isValidTextContent(iso88591Only);
      expect(result.isValid).toBe(true);
      // Must warn the caller that encoding issues were detected and characters were replaced
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => /encoding issues/i.test(w.userMessage))).toBe(true);
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

    it('strips UTF-16 BOM before decoding', () => {
      // 0xFF 0xFE = UTF-16 LE BOM, followed by plain ASCII bytes decodable as UTF-8
      const bomBytes = new Uint8Array([0xff, 0xfe, ...new TextEncoder().encode('test')]);
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
      const content = 'content';
      const file = new File([content], 'test.log', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 501 * 1024 * 1024, configurable: true });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => /too large/i.test(e.userMessage))).toBe(true);
    });

    it('warns for file larger than 100MB but below 500MB', async () => {
      const content = 'valid log content\nline 2';
      const file = new File([content], 'test.log', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 110 * 1024 * 1024, configurable: true });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => /large file/i.test(w.userMessage))).toBe(true);
    });

    it('rejects file with null bytes', async () => {
      const content = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const file = new File([content], 'test.log', { type: 'text/plain' });
      const result = await validateTextFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
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
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects empty gzip file', async () => {
      const file = new File([], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects gzip file larger than 500MB', async () => {
      const content = 'valid';
      const encoded = new TextEncoder().encode(content);
      const compressed = compressSync(encoded);
      const file = new File([compressed as BlobPart], 'big.log.gz', { type: 'application/gzip' });
      Object.defineProperty(file, 'size', { value: 501 * 1024 * 1024, configurable: true });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => /too large/i.test(e.userMessage))).toBe(true);
    });

    it('warns for gzip file larger than 100MB but below 500MB', async () => {
      const content = 'valid log content\nline 2';
      const encoded = new TextEncoder().encode(content);
      const compressed = compressSync(encoded);
      const file = new File([compressed as BlobPart], 'big.log.gz', { type: 'application/gzip' });
      Object.defineProperty(file, 'size', { value: 110 * 1024 * 1024, configurable: true });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => /large file/i.test(w.userMessage))).toBe(true);
    });

    it('rejects gzip with binary content (null bytes)', async () => {
      // Create gzip with binary content containing null bytes
      const binaryContent = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0x00, 0x64]); // "test\0d"
      const compressed = compressSync(binaryContent);
      const file = new File([compressed as BlobPart], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects corrupted gzip file', async () => {
      // Valid gzip header but corrupted/incomplete data
      const corrupted = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff, 0xff, 0xff]);
      const file = new File([corrupted as BlobPart], 'test.log.gz', { type: 'application/gzip' });
      const result = await validateGzipFile(file, decompressSync);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
