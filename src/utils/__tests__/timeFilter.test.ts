import { describe, it, expect } from 'vitest';
import {
  parseTimeInput,
  shortcutToMs,
  getTimeDisplayName,
  calculateTimeRange,
  isInTimeRange,
  timeToMs,
  timeToISO,
  timeToURLFormat,
  urlToTimeFormat,
} from '../timeUtils';

describe('Time Filter Utilities', () => {
  describe('parseTimeInput', () => {
    it('should parse shortcut strings', () => {
      expect(parseTimeInput('last-5-min')).toBe('last-5-min');
      expect(parseTimeInput('last-10-min')).toBe('last-10-min');
      expect(parseTimeInput('last-hour')).toBe('last-hour');
      expect(parseTimeInput('last-day')).toBe('last-day');
    });

    it('should parse ISO time format', () => {
      expect(parseTimeInput('12:34:56')).toBe('12:34:56');
      expect(parseTimeInput('12:34:56.123456')).toBe('12:34:56.123456');
      expect(parseTimeInput('23:59:59.999999')).toBe('23:59:59.999999');
    });

    it('should return null for invalid input', () => {
      expect(parseTimeInput('invalid')).toBeNull();
      expect(parseTimeInput('12:60:00')).toBeNull();
      expect(parseTimeInput('')).toBeNull();
    });

    it('should handle whitespace', () => {
      expect(parseTimeInput('  last-5-min  ')).toBe('last-5-min');
      expect(parseTimeInput('  12:34:56  ')).toBe('12:34:56');
    });
  });

  describe('shortcutToMs', () => {
    it('should convert shortcuts to milliseconds', () => {
      expect(shortcutToMs('last-5-min')).toBe(5 * 60 * 1000);
      expect(shortcutToMs('last-10-min')).toBe(10 * 60 * 1000);
      expect(shortcutToMs('last-hour')).toBe(60 * 60 * 1000);
      expect(shortcutToMs('last-day')).toBe(24 * 60 * 60 * 1000);
    });

    it('should return 0 for unknown shortcut', () => {
      expect(shortcutToMs('unknown')).toBe(0);
    });
  });

  describe('getTimeDisplayName', () => {
    it('should return display names for shortcuts', () => {
      expect(getTimeDisplayName('last-5-min')).toBe('Last 5 min');
      expect(getTimeDisplayName('last-10-min')).toBe('Last 10 min');
      expect(getTimeDisplayName('last-hour')).toBe('Last hour');
      expect(getTimeDisplayName('last-day')).toBe('Last day');
    });

    it('should return time string for ISO times', () => {
      expect(getTimeDisplayName('12:34:56')).toBe('12:34:56');
    });

    it('should return empty string for null', () => {
      expect(getTimeDisplayName(null)).toBe('');
    });

    it('should return End of log for end', () => {
      expect(getTimeDisplayName('end')).toBe('End of log');
    });
  });

  describe('calculateTimeRange', () => {
    it('should return full range when no filters set', () => {
      const result = calculateTimeRange(null, null, 10000);
      expect(result.startMs).toBe(0);
      expect(result.endMs).toBe(10000);
    });

    it('should handle shortcut as start time', () => {
      const maxMs = timeToMs('12:45:00'); // 45900000 ms
      const result = calculateTimeRange('last-5-min', 'end', maxMs);
      expect(result.endMs).toBe(maxMs);
      expect(result.startMs).toBe(maxMs - 5 * 60 * 1000);
    });

    it('should handle ISO times', () => {
      const maxMs = timeToMs('12:45:00');
      const result = calculateTimeRange('12:34:56', '12:45:00', maxMs);
      expect(result.startMs).toBe(timeToMs('12:34:56'));
      expect(result.endMs).toBe(timeToMs('12:45:00'));
    });

    it('should not allow start time before 0', () => {
      const maxMs = timeToMs('00:01:00'); // 60000 ms
      const result = calculateTimeRange('last-hour', 'end', maxMs); // 3600000 ms offset
      expect(result.startMs).toBeGreaterThanOrEqual(0);
      expect(result.startMs).toBe(0); // Clamped to 0
    });
  });

  describe('isInTimeRange', () => {
    it('should check if timestamp is in range', () => {
      const startMs = timeToMs('12:00:00');
      const endMs = timeToMs('13:00:00');

      expect(isInTimeRange('12:30:00', startMs, endMs)).toBe(true);
      expect(isInTimeRange('12:00:00', startMs, endMs)).toBe(true);
      expect(isInTimeRange('13:00:00', startMs, endMs)).toBe(true);
    });

    it('should exclude times outside range', () => {
      const startMs = timeToMs('12:00:00');
      const endMs = timeToMs('13:00:00');

      expect(isInTimeRange('11:59:59', startMs, endMs)).toBe(false);
      expect(isInTimeRange('13:00:01', startMs, endMs)).toBe(false);
    });
  });

  describe('timeToMs', () => {
    it('should convert time strings to milliseconds', () => {
      expect(timeToMs('00:00:00')).toBe(0);
      expect(timeToMs('01:00:00')).toBe(3600000);
      expect(timeToMs('00:01:00')).toBe(60000);
      expect(timeToMs('00:00:01')).toBe(1000);
      expect(timeToMs('12:34:56')).toBe(45296000);
    });

    it('should handle partial seconds', () => {
      expect(timeToMs('00:00:01.5')).toBe(1500);
      expect(timeToMs('00:00:00.123456')).toBe(123.456);
    });
  });

  describe('timeToISO', () => {
    it('should preserve full ISO datetime with actual date', () => {
      expect(timeToISO('2022-04-15T09:45:19.968Z')).toBe('2022-04-15T09:45:19.968Z');
      expect(timeToISO('2022-04-15T09:45:19Z')).toBe('2022-04-15T09:45:19Z');
      expect(timeToISO('2025-12-31T23:59:59.999Z')).toBe('2025-12-31T23:59:59.999Z');
    });

    it('should add epoch date to time-only strings', () => {
      expect(timeToISO('09:45:19')).toBe('1970-01-01T09:45:19Z');
      expect(timeToISO('09:45:19.968')).toBe('1970-01-01T09:45:19.968Z');
      expect(timeToISO('00:00:00')).toBe('1970-01-01T00:00:00Z');
      expect(timeToISO('23:59:59.999999')).toBe('1970-01-01T23:59:59.999999Z');
    });

    it('should return invalid input unchanged', () => {
      expect(timeToISO('invalid')).toBe('invalid');
      expect(timeToISO('start')).toBe('start');
      expect(timeToISO('last24h')).toBe('last24h');
      expect(timeToISO('')).toBe('');
    });
  });

  describe('timeToURLFormat', () => {
    it('should preserve full ISO datetime with actual date', () => {
      expect(timeToURLFormat('2022-04-15T09:45:19.968Z')).toBe('2022-04-15T09:45:19.968Z');
      expect(timeToURLFormat('2025-12-31T23:59:59Z')).toBe('2025-12-31T23:59:59Z');
    });

    it('should convert time-only to ISO with epoch date', () => {
      expect(timeToURLFormat('09:45:19.968')).toBe('1970-01-01T09:45:19.968Z');
    });

    it('should keep shortcuts unchanged', () => {
      expect(timeToURLFormat('start')).toBe('start');
      expect(timeToURLFormat('end')).toBe('end');
      expect(timeToURLFormat('lastHour')).toBe('lastHour');
      expect(timeToURLFormat('lastDay')).toBe('lastDay');
    });

    it('should return null for null input', () => {
      expect(timeToURLFormat(null)).toBeNull();
    });
  });

  describe('urlToTimeFormat', () => {
    it('should preserve full ISO datetime with actual date', () => {
      expect(urlToTimeFormat('2022-04-15T09:45:19.968Z')).toBe('2022-04-15T09:45:19.968Z');
      expect(urlToTimeFormat('2025-12-31T23:59:59Z')).toBe('2025-12-31T23:59:59Z');
    });

    it('should convert epoch-based ISO to time-only for backward compatibility', () => {
      expect(urlToTimeFormat('1970-01-01T09:45:19.968Z')).toBe('09:45:19.968');
      expect(urlToTimeFormat('1970-01-01T00:00:00Z')).toBe('00:00:00');
    });

    it('should keep shortcuts unchanged', () => {
      expect(urlToTimeFormat('start')).toBe('start');
      expect(urlToTimeFormat('end')).toBe('end');
      expect(urlToTimeFormat('lastHour')).toBe('lastHour');
    });

    it('should return null for null input', () => {
      expect(urlToTimeFormat(null)).toBeNull();
    });
  });

  describe('timeToURLFormat ↔ urlToTimeFormat round-trip', () => {
    it('should preserve full ISO datetimes with real dates in both directions', () => {
      const original = '2026-01-21T09:48:37.123456Z';
      const toURL = timeToURLFormat(original);
      const fromURL = urlToTimeFormat(toURL);
      expect(fromURL).toBe(original);
    });

    it('should handle time-only strings converting to epoch ISO in URL', () => {
      const original = '09:48:37.123456';
      const toURL = timeToURLFormat(original); // -> 1970-01-01T09:48:37.123456Z
      expect(toURL).toBe('1970-01-01T09:48:37.123456Z');
      // When read back from URL, epoch dates are converted to time-only (without Z)
      const fromURL = urlToTimeFormat(toURL);
      expect(fromURL).toBe('09:48:37.123456');
    });

    it('should preserve shortcuts in both directions', () => {
      const shortcuts = ['start', 'end', 'last-hour', 'last-day', 'last-5-min'];
      shortcuts.forEach(shortcut => {
        const toURL = timeToURLFormat(shortcut);
        const fromURL = urlToTimeFormat(toURL);
        expect(fromURL).toBe(shortcut);
      });
    });
  });

  describe('shortcut handling - hyphenated format', () => {
    it('should handle all hyphenated shortcuts', () => {
      expect(shortcutToMs('last-min')).toBe(60 * 1000);
      expect(getTimeDisplayName('last-min')).toBe('Last min');
      expect(parseTimeInput('last-min')).toBe('last-min');
    });
  });
});
