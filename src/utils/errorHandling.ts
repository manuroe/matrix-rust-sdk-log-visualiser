/**
 * Centralized error handling and validation utilities.
 * 
 * Provides typed error classes with consistent severity levels and user-friendly messages.
 * All errors extend AppError base class for type-safe error handling.
 */

/**
 * Error severity levels for user feedback.
 * - error: Critical failure preventing operation
 * - warning: Non-blocking issue, operation can continue
 */
export type ErrorSeverity = 'error' | 'warning';

/**
 * Base error class for application-wide error handling.
 * Extends native Error with severity and user-friendly messaging.
 */
export class AppError extends Error {
  /** Human-readable error message suitable for display to users */
  public readonly userMessage: string;
  
  /** Error severity level */
  public readonly severity: ErrorSeverity;
  
  /** Original error that caused this error, if any */
  public readonly cause?: Error;

  constructor(
    userMessage: string,
    severity: ErrorSeverity = 'error',
    cause?: Error
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.severity = severity;
    this.cause = cause;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * File validation and processing errors.
 * Used for file size limits, encoding issues, format validation, etc.
 */
export class FileError extends AppError {
  constructor(userMessage: string, severity: ErrorSeverity = 'error', cause?: Error) {
    super(userMessage, severity, cause);
    this.name = 'FileError';
  }
}

/**
 * Log parsing and structure errors.
 * Used when log content is malformed or doesn't match expected format.
 */
export class ParsingError extends AppError {
  constructor(userMessage: string, severity: ErrorSeverity = 'error', cause?: Error) {
    super(userMessage, severity, cause);
    this.name = 'ParsingError';
  }
}

/**
 * User input validation errors.
 * Used for invalid time formats, search patterns, filter values, etc.
 */
export class ValidationError extends AppError {
  constructor(userMessage: string, severity: ErrorSeverity = 'error', cause?: Error) {
    super(userMessage, severity, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Validation result with typed errors and warnings.
 * Replaces simple string-based validation results.
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  isValid: boolean;
  
  /** Critical validation errors that prevent operation */
  errors: AppError[];
  
  /** Non-blocking validation warnings */
  warnings: AppError[];
  
  /** Additional metadata (e.g., detected encoding) */
  metadata?: Record<string, unknown>;
}

/**
 * Creates a successful validation result with optional warnings.
 */
export function validationSuccess(
  warnings: AppError[] = [],
  metadata?: Record<string, unknown>
): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings,
    metadata,
  };
}

/**
 * Creates a failed validation result with errors and optional warnings.
 */
export function validationFailure(
  errors: AppError[],
  warnings: AppError[] = [],
  metadata?: Record<string, unknown>
): ValidationResult {
  return {
    isValid: false,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Wraps a thrown error into an AppError if it isn't already.
 * Useful in catch blocks to ensure consistent error types.
 */
export function wrapError(error: unknown, defaultMessage: string, severity: ErrorSeverity = 'error'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(defaultMessage, severity, error);
  }
  
  // Handle non-Error objects (strings, objects, etc.)
  const message = typeof error === 'string' ? error : defaultMessage;
  return new AppError(message, severity);
}

/**
 * Formats file size in human-readable format (MB, GB, etc.)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
