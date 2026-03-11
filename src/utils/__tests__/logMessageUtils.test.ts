import { describe, it, expect } from 'vitest';
import { extractCoreMessage } from '../logMessageUtils';

describe('extractCoreMessage', () => {
  it('strips ISO timestamp and level prefix from a WARN line', () => {
    const raw = '2026-01-28T13:24:43.950890Z WARN Something went wrong';
    expect(extractCoreMessage(raw)).toBe('Something went wrong');
  });

  it('strips ISO timestamp and level prefix from an ERROR line', () => {
    const raw = '2026-01-28T13:24:43.950890Z ERROR Connection timed out';
    expect(extractCoreMessage(raw)).toBe('Connection timed out');
  });

  it('strips ISO timestamp and level prefix from an INFO line', () => {
    const raw = '2026-01-28T13:24:43.950890Z INFO Application started';
    expect(extractCoreMessage(raw)).toBe('Application started');
  });

  it('returns original string when message has no timestamp prefix', () => {
    const raw = 'No timestamp here';
    expect(extractCoreMessage(raw)).toBe('No timestamp here');
  });

  it('returns original string for an empty message', () => {
    expect(extractCoreMessage('')).toBe('');
  });

  it('handles multi-word payloads', () => {
    const raw = '2026-01-28T13:24:43.950890Z ERROR Failed to send to: matrix.org: timeout 5000ms';
    expect(extractCoreMessage(raw)).toBe(
      'Failed to send to: matrix.org: timeout 5000ms'
    );
  });

  it('tolerates extra whitespace between level and payload', () => {
    const raw = '2026-01-28T13:24:43.950890Z TRACE   indented payload';
    expect(extractCoreMessage(raw)).toBe('indented payload');
  });
});
