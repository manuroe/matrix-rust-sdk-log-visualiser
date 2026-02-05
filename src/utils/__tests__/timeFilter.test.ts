import { describe, it, expect } from 'vitest';
import {
  parseTimeInput,
  shortcutToMs,
  getTimeDisplayName,
  calculateTimeRange,
  isInTimeRange,
  timeToMs,
} from '../timeUtils';

describe('Time Filter Utilities', () => {
  describe('parseTimeInput', () => {
    it('should parse shortcut strings', () => {
      expect(parseTimeInput('lastFiveMin')).toBe('lastFiveMin');
      expect(parseTimeInput('lastTenMin')).toBe('lastTenMin');
      expect(parseTimeInput('lastHour')).toBe('lastHour');
      expect(parseTimeInput('lastDay')).toBe('lastDay');
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
      expect(parseTimeInput('  lastFiveMin  ')).toBe('lastFiveMin');
      expect(parseTimeInput('  12:34:56  ')).toBe('12:34:56');
    });
  });

  describe('shortcutToMs', () => {
    it('should convert shortcuts to milliseconds', () => {
      expect(shortcutToMs('lastFiveMin')).toBe(5 * 60 * 1000);
      expect(shortcutToMs('lastTenMin')).toBe(10 * 60 * 1000);
      expect(shortcutToMs('lastHour')).toBe(60 * 60 * 1000);
      expect(shortcutToMs('lastDay')).toBe(24 * 60 * 60 * 1000);
    });

    it('should return 0 for unknown shortcut', () => {
      expect(shortcutToMs('unknown')).toBe(0);
    });
  });

  describe('getTimeDisplayName', () => {
    it('should return display names for shortcuts', () => {
      expect(getTimeDisplayName('lastFiveMin')).toBe('Last 5 min');
      expect(getTimeDisplayName('lastTenMin')).toBe('Last 10 min');
      expect(getTimeDisplayName('lastHour')).toBe('Last hour');
      expect(getTimeDisplayName('lastDay')).toBe('Last day');
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
      const result = calculateTimeRange('lastFiveMin', 'end', maxMs);
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
      const result = calculateTimeRange('lastHour', 'end', maxMs); // 3600000 ms offset
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
});
