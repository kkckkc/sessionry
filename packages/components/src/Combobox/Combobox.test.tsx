import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Combobox } from './Combobox';

describe('Combobox', () => {
  it('renders an editable combobox input', () => {
    render(
      <Combobox
        label="Model"
        options={[{ value: 'gpt-4o', label: 'GPT-4o' }]}
        value="gpt-4o"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument();
  });
});
