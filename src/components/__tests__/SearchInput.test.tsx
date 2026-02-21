import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder text', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search..." />);
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchInput value="test query" onChange={() => {}} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('does not show clear button when empty', () => {
    render(<SearchInput value="" onChange={() => {}} />);
    
    expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
  });

  it('shows clear button when input has value', () => {
    render(<SearchInput value="something" onChange={() => {}} />);
    
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
  });

  it('calls onChange with empty string when clear button clicked', () => {
    const onChange = vi.fn();
    render(<SearchInput value="something" onChange={onChange} />);
    
    const clearButton = screen.getByLabelText('Clear input');
    fireEvent.click(clearButton);
    
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('calls onClear instead of onChange when provided', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchInput value="something" onChange={onChange} onClear={onClear} />);
    
    const clearButton = screen.getByLabelText('Clear input');
    fireEvent.click(clearButton);
    
    expect(onClear).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears input when Escape key is pressed', () => {
    const onChange = vi.fn();
    render(<SearchInput value="something" onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('forwards onKeyDown events to parent', () => {
    const onKeyDown = vi.fn();
    render(<SearchInput value="" onChange={() => {}} onKeyDown={onKeyDown} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <SearchInput value="" onChange={() => {}} className="custom-class" />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('passes through additional input props', () => {
    render(
      <SearchInput 
        value="" 
        onChange={() => {}} 
        title="Custom title"
        aria-label="Custom label"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('title', 'Custom title');
    expect(input).toHaveAttribute('aria-label', 'Custom label');
  });
});
