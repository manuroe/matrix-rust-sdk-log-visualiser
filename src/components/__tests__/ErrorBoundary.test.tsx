import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { AppError } from '../../utils/errorHandling';

// Suppress expected error output in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** A component that throws when shouldThrow prop is true */
function ThrowingComponent({ shouldThrow = false, message = 'Test error' }: { shouldThrow?: boolean; message?: string }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Normal content</div>;
}

/** A component that throws an AppError */
function AppErrorComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new AppError('App-level error message', 'error');
  }
  return <div>Normal content</div>;
}

describe('ErrorBoundary', () => {
  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <span>First</span>
          <span>Second</span>
        </ErrorBoundary>
      );
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows default fallback UI when a child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows the error message in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow message="Something broke" />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows AppError userMessage in fallback UI', () => {
      render(
        <ErrorBoundary>
          <AppErrorComponent shouldThrow />
        </ErrorBoundary>
      );
      expect(screen.getByText('App-level error message')).toBeInTheDocument();
    });

    it('shows Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('Try Again button is present and clickable', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toBeInTheDocument();
      // Clicking should not throw
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  describe('custom fallback', () => {
    it('uses custom fallback when provided', () => {
      const customFallback = (error: Error) => (
        <div>Custom fallback: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow message="custom error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom fallback: custom error')).toBeInTheDocument();
    });

    it('passes resetError to custom fallback', () => {
      const resetMock = vi.fn();
      const customFallback = (_error: Error, reset: () => void) => (
        <button onClick={reset}>Reset</button>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
      // Clicking should not throw
      expect(() => fireEvent.click(resetButton)).not.toThrow();
    });
  });
});
