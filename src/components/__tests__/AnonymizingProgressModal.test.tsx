/**
 * Unit tests for AnonymizingProgressModal.
 *
 * Covers the two rendering branches (isAnonymizing false → renders nothing,
 * isAnonymizing true → renders the full progress dialog) and verifies the
 * Cancel button is wired to the store's cancelAnonymization action.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnonymizingProgressModal } from '../AnonymizingProgressModal';
import { useLogStore } from '../../stores/logStore';
import { createParsedLogLine } from '../../test/fixtures';

describe('AnonymizingProgressModal', () => {
  beforeEach(() => {
    useLogStore.getState().clearData();
  });

  it('renders nothing when isAnonymizing is false', () => {
    useLogStore.setState({ isAnonymizing: false });
    const { container } = render(<AnonymizingProgressModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the progress dialog when isAnonymizing is true', () => {
    useLogStore.setState({
      isAnonymizing: true,
      anonymizingProgress: 0,
      rawLogLines: [createParsedLogLine({ lineNumber: 0 })],
    });
    render(<AnonymizingProgressModal />);
    expect(screen.getByRole('dialog', { name: /anonymising logs/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows correct line count and percentage', () => {
    const lines = Array.from({ length: 100 }, (_, i) => createParsedLogLine({ lineNumber: i }));
    useLogStore.setState({
      isAnonymizing: true,
      anonymizingProgress: 0.5,
      rawLogLines: lines,
    });
    render(<AnonymizingProgressModal />);
    // 50% of 100 lines → "50 / 100 lines" and aria-valuenow=50
    expect(screen.getByText('50 / 100 lines')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('calls cancelAnonymization when Cancel is clicked', () => {
    const cancelAnonymization = vi.fn();
    useLogStore.setState({
      isAnonymizing: true,
      anonymizingProgress: 0,
      rawLogLines: [createParsedLogLine({ lineNumber: 0 })],
      cancelAnonymization,
    });
    render(<AnonymizingProgressModal />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(cancelAnonymization).toHaveBeenCalledTimes(1);
  });
});
