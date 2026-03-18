import { describe, it, expect } from 'vitest';
import { extractCoreMessage, stripLogPrefix } from '../logMessageUtils';

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

  it('strips prefix from a timestamp without fractional seconds', () => {
    // logParser accepts timestamps without the fractional-seconds component;
    // extractCoreMessage must normalise those lines too.
    const raw = '2026-01-28T13:24:43Z WARN No fractions here';
    expect(extractCoreMessage(raw)).toBe('No fractions here');
  });

  it('strips prefix from a timestamp without trailing Z', () => {
    // Some log lines omit the trailing Z (local-time format).
    const raw = '2026-01-28T13:24:43.123456 INFO Payload without Z';
    expect(extractCoreMessage(raw)).toBe('Payload without Z');
  });
});

describe('stripLogPrefix', () => {
  it('strips a standard timestamp + level prefix', () => {
    expect(stripLogPrefix('2026-01-28T13:24:43.950890Z INFO Something happened'))
      .toBe('Something happened');
  });

  it('strips a prefix without fractional seconds', () => {
    expect(stripLogPrefix('2026-01-28T13:24:43Z WARN No fractions here'))
      .toBe('No fractions here');
  });

  it('strips a prefix without trailing Z', () => {
    expect(stripLogPrefix('2026-01-28T13:24:43.123456 INFO Payload without Z'))
      .toBe('Payload without Z');
  });

  it('returns the original string unchanged when there is no prefix', () => {
    expect(stripLogPrefix('No timestamp here')).toBe('No timestamp here');
  });
});
