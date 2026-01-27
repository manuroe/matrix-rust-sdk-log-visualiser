import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLogStore } from '../../stores/logStore';
import { LogDisplayView } from '../LogDisplayView';
import type { ParsedLogLine } from '../../types/log.types';

// Mock react-virtual to simplify rendering in tests
vi.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: (opts: any) => ({
      getTotalSize: () => opts.count * 24,
      getVirtualItems: () => Array.from({ length: opts.count }, (_, i) => ({ index: i, key: i, start: i * 24 })),
      measureElement: () => {},
      measure: () => {},
      measurementsCache: [],
    }),
  };
});

function makeLogs(total: number, matchIndices: number[]): ParsedLogLine[] {
  const logs: ParsedLogLine[] = [];
  for (let i = 0; i < total; i++) {
    const isMatch = matchIndices.includes(i);
    logs.push({
      lineNumber: i,
      rawText: `${new Date(0).toISOString()} INFO ${isMatch ? 'MATCH' : 'line'} ${i}`,
      timestamp: new Date(0).toISOString(),
      level: 'INFO',
      message: isMatch ? `MATCH ${i}` : `line ${i}`,
    });
  }
  return logs;
}

function getLineContainer(lineNumber: number): HTMLElement {
  const candidates = screen.getAllByText(String(lineNumber));
  const lineNumSpan = candidates.find((el) => el.classList.contains('log-line-number')) as HTMLElement;
  if (!lineNumSpan) throw new Error(`Line number span not found for ${lineNumber}`);
  return lineNumSpan.closest('.log-line') as HTMLElement;
}

describe('LogDisplayView gap arrows & expansion', () => {
  beforeEach(() => {
    // Reset store
    useLogStore.getState().clearData();
  });

  it('shows arrows and expands down on newly displayed lines', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    // Line 76 should be visible
    // Ensure line containers exist
    const line76Container = getLineContainer(76);
    expect(line76Container).toBeInTheDocument();

    // It should have a down arrow
    const downBtn76 = line76Container.querySelector('button[aria-label="Load hidden lines below"]') as HTMLButtonElement;
    expect(downBtn76).toBeTruthy();
    await user.click(downBtn76);

    // After expansion, line 86 should appear
    const line86Container = getLineContainer(86);
    expect(line86Container).toBeInTheDocument();

    // Click down on line 86's down arrow: find the nearest down arrow again
    const downBtn86 = line86Container.querySelector('button[aria-label="Load hidden lines below"]') as HTMLButtonElement;
    expect(downBtn86).toBeTruthy();
    await user.click(downBtn86);

    // Now line 96 should appear
    const line96Container = getLineContainer(96);
    expect(line96Container).toBeInTheDocument();
  });

  it('shows arrows and expands up on newly displayed lines', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    // Line 157 visible
    const line157Container = getLineContainer(157);
    expect(line157Container).toBeInTheDocument();

    // It should have an up arrow
    const upBtn157 = line157Container.querySelector('button[aria-label="Load hidden lines above"]') as HTMLButtonElement;
    expect(upBtn157).toBeTruthy();
    await user.click(upBtn157);

    // After expansion, line 156 should appear
    const line156Container = getLineContainer(156);
    expect(line156Container).toBeInTheDocument();

    // Next up arrow should be on the topmost newly displayed line (147)
    const line147Container = getLineContainer(147);
    const upBtn147 = line147Container.querySelector('button[aria-label="Load hidden lines above"]') as HTMLButtonElement;
    expect(upBtn147).toBeTruthy();
    await user.click(upBtn147);

    const line146Container = getLineContainer(146);
    expect(line146Container).toBeInTheDocument();
  });

  it('context menu: Load all to next line (down)', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line76Container = getLineContainer(76);
    const downBtn76 = line76Container.querySelector('button[aria-label="Load hidden lines below"]') as HTMLButtonElement;
    expect(downBtn76).toBeTruthy();
    fireEvent.contextMenu(downBtn76);

    const loadAllNext = await screen.findByText(/Load all to next line/i);
    await user.click(loadAllNext);

    // Should expand all until next anchor (157), making 156 visible and no down arrow on 156
    const line156Container = getLineContainer(156);
    expect(line156Container).toBeInTheDocument();
    const downBtn156 = line156Container.querySelector('button[aria-label="Load hidden lines below"]');
    expect(downBtn156).toBeNull();
  });

  it('context menu: Load all to previous line (up)', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line157Container = getLineContainer(157);
    const upBtn157 = line157Container.querySelector('button[aria-label="Load hidden lines above"]') as HTMLButtonElement;
    expect(upBtn157).toBeTruthy();
    fireEvent.contextMenu(upBtn157);

    const loadAllPrev = await screen.findByText(/Load all to previous line/i);
    await user.click(loadAllPrev);

    // Should expand all until previous anchor (76), making 77 visible and no up arrow on 77
    const line77Container = getLineContainer(77);
    expect(line77Container).toBeInTheDocument();
    const upBtn77 = line77Container.querySelector('button[aria-label="Load hidden lines above"]');
    expect(upBtn77).toBeNull();
  });

  it('context menu: Load all to bottom (down at last line)', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line157Container = getLineContainer(157);
    const downBtn157 = line157Container.querySelector('button[aria-label="Load hidden lines below"]') as HTMLButtonElement;
    expect(downBtn157).toBeTruthy();
    fireEvent.contextMenu(downBtn157);

    const loadAllBottom = await screen.findByText(/Load all to bottom/i);
    await user.click(loadAllBottom);

    // Should expand all to file end, making last line visible and no down arrow there
    const line199Container = getLineContainer(199);
    expect(line199Container).toBeInTheDocument();
    const downBtn199 = line199Container.querySelector('button[aria-label="Load hidden lines below"]');
    expect(downBtn199).toBeNull();
  });

  it('context menu: Load all to top (up at first line)', async () => {
    const user = userEvent.setup();
    const total = 200;
    const matchIndices = [76, 157];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line76Container = getLineContainer(76);
    const upBtn76 = line76Container.querySelector('button[aria-label="Load hidden lines above"]') as HTMLButtonElement;
    expect(upBtn76).toBeTruthy();
    fireEvent.contextMenu(upBtn76);

    const loadAllTop = await screen.findByText(/Load all to top/i);
    await user.click(loadAllTop);

    // Should expand all to file start, making first line visible and no up arrow there
    const line0Container = getLineContainer(0);
    expect(line0Container).toBeInTheDocument();
    const upBtn0 = line0Container.querySelector('button[aria-label="Load hidden lines above"]');
    expect(upBtn0).toBeNull();
  });

  it('stripPrefix toggle affects displayed text', async () => {
    const user = userEvent.setup();
    const total = 10;
    const matchIndices = [3, 7];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line3Container = getLineContainer(3);
    const textSpan = line3Container.querySelector('.log-line-text') as HTMLSpanElement;
    expect(textSpan).toBeTruthy();
    // With stripPrefix=true (default), message should not start with ISO timestamp
    expect(textSpan.textContent?.trim().startsWith(new Date(0).toISOString())).toBe(false);

    // Toggle stripPrefix off
    const stripCheckbox = screen.getByLabelText(/Strip prefix/i) as HTMLInputElement;
    await user.click(stripCheckbox);

    // Now the log-line-text should include the timestamp prefix in the rawText (due to no strip)
    expect(textSpan.textContent?.includes(new Date(0).toISOString())).toBe(true);
  });

  it('lineWrap toggles wrap class on lines', async () => {
    const user = userEvent.setup();
    const total = 5;
    const matchIndices = [2, 4];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    let line2Container = getLineContainer(2);
    // Default is nowrap
    expect(line2Container.classList.contains('nowrap')).toBe(true);
    expect(line2Container.classList.contains('wrap')).toBe(false);

    // Toggle line wrap
    const wrapCheckbox = screen.getByLabelText(/Line wrap/i) as HTMLInputElement;
    await user.click(wrapCheckbox);

    // Re-query after state change to avoid stale node
    line2Container = getLineContainer(2);
    expect(line2Container.classList.contains('wrap')).toBe(true);
    expect(line2Container.classList.contains('nowrap')).toBe(false);
  });

  it('contextLines shows surrounding lines when enabled', async () => {
    const user = userEvent.setup();
    const total = 30;
    const matchIndices = [15];
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    // Initially only matching line should be present
    const line15Container = getLineContainer(15);
    expect(line15Container).toBeInTheDocument();
    // A non-matching neighbor should not be present yet
    expect(() => getLineContainer(14)).toThrow();

    // Enable context via the ≡ button (sets contextLines=5)
    const ctxToggle = screen.getByTitle(/Context lines before\/after matches/i);
    await user.click(ctxToggle as HTMLButtonElement);

    // Now surrounding lines within 5 should appear
    const line14Container = getLineContainer(14);
    const line20Container = getLineContainer(20);
    expect(line14Container).toBeInTheDocument();
    expect(line20Container).toBeInTheDocument();
  });

  it('removes arrows when gap fully expanded to next anchor', async () => {
    const total = 200;
    const matchIndices = [76, 77]; // Adjacent so no gap below 76
    useLogStore.setState({ rawLogLines: makeLogs(total, matchIndices) });

    render(<LogDisplayView requestFilter="MATCH" defaultShowOnlyMatching={true} />);

    const line76Container2 = getLineContainer(76);
    const line77Container2 = getLineContainer(77);
    expect(line76Container2).toBeInTheDocument();
    expect(line77Container2).toBeInTheDocument();

    // There should be no down arrow for 76 because next line is visible
    const downBtn76_2 = line76Container2.querySelector('button[aria-label="Load hidden lines below"]');
    expect(downBtn76_2).toBeNull();
  });
});
