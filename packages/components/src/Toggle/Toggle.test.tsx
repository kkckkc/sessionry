import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders a labelled switch and calls onChange with the next checked state', () => {
    const onChange = vi.fn();

    render(<Toggle label="Enable feature" checked={false} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: 'Enable feature' });
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toBe(true);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();

    render(<Toggle label="Disabled feature" checked={false} onChange={onChange} disabled />);

    const toggle = screen.getByRole('switch', { name: 'Disabled feature' });
    fireEvent.click(toggle);

    expect(onChange).not.toHaveBeenCalled();
  });
});
