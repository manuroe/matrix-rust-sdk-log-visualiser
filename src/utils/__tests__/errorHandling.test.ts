import { describe, it, expect } from 'vitest';
import {
  AppError,
  FileError,
  ParsingError,
  ValidationError,
  validationSuccess,
  validationFailure,
  wrapError,
  formatFileSize,
} from '../errorHandling';

describe('AppError', () => {
  it('creates with userMessage and default severity error', () => {
    const err = new AppError('something failed');
    expect(err.userMessage).toBe('something failed');
    expect(err.severity).toBe('error');
    expect(err.name).toBe('AppError');
    expect(err.message).toBe('something failed');
  });

  it('creates with warning severity', () => {
    const err = new AppError('heads up', 'warning');
    expect(err.severity).toBe('warning');
  });

  it('stores cause error', () => {
    const cause = new Error('original');
    const err = new AppError('wrapped', 'error', cause);
    expect(err.cause).toBe(cause);
  });

  it('is instance of Error', () => {
    const err = new AppError('test');
    expect(err instanceof Error).toBe(true);
  });
});

describe('FileError', () => {
  it('creates with name FileError', () => {
    const err = new FileError('file issue');
    expect(err.name).toBe('FileError');
    expect(err.userMessage).toBe('file issue');
    expect(err instanceof AppError).toBe(true);
  });

  it('creates with warning severity', () => {
    const err = new FileError('file warning', 'warning');
    expect(err.severity).toBe('warning');
  });

  it('stores cause', () => {
    const cause = new Error('io error');
    const err = new FileError('file issue', 'error', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('ParsingError', () => {
  it('creates with name ParsingError', () => {
    const err = new ParsingError('parse issue');
    expect(err.name).toBe('ParsingError');
    expect(err instanceof AppError).toBe(true);
  });

  it('creates with warning severity', () => {
    const err = new ParsingError('parse warning', 'warning');
    expect(err.severity).toBe('warning');
  });
});

describe('ValidationError', () => {
  it('creates with name ValidationError', () => {
    const err = new ValidationError('invalid input');
    expect(err.name).toBe('ValidationError');
    expect(err instanceof AppError).toBe(true);
  });

  it('creates with cause', () => {
    const cause = new Error('root cause');
    const err = new ValidationError('validation failed', 'error', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('validationSuccess', () => {
  it('returns isValid true with no warnings', () => {
    const result = validationSuccess();
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('includes provided warnings', () => {
    const warnings = [new AppError('watch out', 'warning')];
    const result = validationSuccess(warnings);
    expect(result.warnings).toHaveLength(1);
    expect(result.isValid).toBe(true);
  });

  it('includes metadata when provided', () => {
    const result = validationSuccess([], { encoding: 'utf-8' });
    expect(result.metadata).toEqual({ encoding: 'utf-8' });
  });
});

describe('validationFailure', () => {
  it('returns isValid false with errors', () => {
    const errors = [new AppError('critical error')];
    const result = validationFailure(errors);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it('includes warnings alongside errors', () => {
    const errors = [new AppError('error')];
    const warnings = [new AppError('warning', 'warning')];
    const result = validationFailure(errors, warnings);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it('includes metadata when provided', () => {
    const result = validationFailure([], [], { size: 1024 });
    expect(result.metadata).toEqual({ size: 1024 });
  });
});

describe('wrapError', () => {
  it('returns AppError as-is', () => {
    const original = new AppError('already wrapped');
    const result = wrapError(original, 'default');
    expect(result).toBe(original);
  });

  it('wraps a regular Error into AppError', () => {
    const original = new Error('native error');
    const result = wrapError(original, 'wrapper message');
    expect(result instanceof AppError).toBe(true);
    expect(result.userMessage).toBe('wrapper message');
    expect(result.cause).toBe(original);
  });

  it('wraps a string error', () => {
    const result = wrapError('string error', 'default message');
    expect(result instanceof AppError).toBe(true);
    expect(result.userMessage).toBe('string error');
  });

  it('uses default message for non-string non-Error values', () => {
    const result = wrapError({ code: 42 }, 'default message');
    expect(result instanceof AppError).toBe(true);
    expect(result.userMessage).toBe('default message');
  });

  it('sets severity on wrapped error', () => {
    const result = wrapError(new Error('err'), 'msg', 'warning');
    expect(result.severity).toBe('warning');
  });

  it('wraps null/undefined as default message', () => {
    const result = wrapError(null, 'fallback');
    expect(result.userMessage).toBe('fallback');
  });
});

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1)).toBe('1 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
  });
});
