import { describe, it, expect } from 'vitest';
import { parseSizeString, formatBytes } from '../sizeUtils';

describe('parseSizeString', () => {
  describe('byte values', () => {
    it('parses plain integer bytes (no unit)', () => {
      expect(parseSizeString('1234')).toBe(1234);
    });

    it('parses explicit B suffix', () => {
      expect(parseSizeString('48B')).toBe(48);
    });

    it('parses lowercase b suffix', () => {
      expect(parseSizeString('48b')).toBe(48);
    });

    it('parses zero bytes', () => {
      expect(parseSizeString('0')).toBe(0);
    });
  });

  describe('kilobyte values', () => {
    it('parses integer kilobytes', () => {
      expect(parseSizeString('10k')).toBe(10 * 1024);
    });

    it('parses uppercase K suffix', () => {
      expect(parseSizeString('10K')).toBe(10 * 1024);
    });

    it('parses fractional kilobytes', () => {
      expect(parseSizeString('38.8k')).toBe(Math.round(38.8 * 1024));
    });
  });

  describe('megabyte values', () => {
    it('parses integer megabytes', () => {
      expect(parseSizeString('2m')).toBe(2 * 1_048_576);
    });

    it('parses uppercase M suffix', () => {
      expect(parseSizeString('2M')).toBe(2 * 1_048_576);
    });

    it('parses fractional megabytes', () => {
      expect(parseSizeString('1.5M')).toBe(Math.round(1.5 * 1_048_576));
    });
  });

  describe('gigabyte values', () => {
    it('parses integer gigabytes', () => {
      expect(parseSizeString('3g')).toBe(3 * 1_073_741_824);
    });

    it('parses uppercase G suffix', () => {
      expect(parseSizeString('3G')).toBe(3 * 1_073_741_824);
    });
  });

  describe('whitespace handling', () => {
    it('parses value with space before unit', () => {
      expect(parseSizeString('10 k')).toBe(10 * 1024);
    });
  });

  describe('edge cases and invalid inputs', () => {
    it('returns 0 for empty string', () => {
      expect(parseSizeString('')).toBe(0);
    });

    it('returns 0 for unknown unit', () => {
      expect(parseSizeString('100x')).toBe(0);
    });

    it('returns 0 for non-numeric input', () => {
      expect(parseSizeString('abc')).toBe(0);
    });

    it('returns 0 for a bare dot', () => {
      expect(parseSizeString('.')).toBe(0);
    });

    it('returns 0 for multiple dots (e.g. "1..2")', () => {
      expect(parseSizeString('1..2')).toBe(0);
    });
  });
});

describe('formatBytes', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1_048_576)).toBe('1.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1_073_741_824)).toBe('1.0 GB');
  });

  it('formats fractional megabytes', () => {
    expect(formatBytes(Math.round(1.5 * 1_048_576))).toBe('1.5 MB');
  });

  it('is consistent with parseSizeString round-trip', () => {
    // A value expressed in logs as "38.8k" should format back to the same order of magnitude
    const bytes = parseSizeString('38.8k');
    const formatted = formatBytes(bytes);
    expect(formatted).toMatch(/KB/);
  });
});
