import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TerminalPresetsSettingsView } from '../src/SettingsView';

describe('TerminalPresetsSettingsView', () => {
  it('adds, saves, and deletes presets through plugin settings updates', async () => {
    const onUpdate = vi.fn(async () => {});

    render(<TerminalPresetsSettingsView settings={{ presets: [] }} onUpdate={onUpdate} pluginId="" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));

    fireEvent.change(screen.getByLabelText('Preset 1 name'), {
      target: { value: 'Dev server' }
    });
    fireEvent.change(screen.getByLabelText('Preset 1 command'), {
      target: { value: 'pnpm dev' }
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        presets: [
          expect.objectContaining({
            name: 'Dev server',
            command: 'pnpm dev'
          })
        ]
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete preset 1' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenLastCalledWith({ presets: [] });
    });
  });

  it('does not persist incomplete presets', async () => {
    const onUpdate = vi.fn(async () => {});

    render(<TerminalPresetsSettingsView settings={{ presets: [] }} onUpdate={onUpdate} pluginId="" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add preset' }));

    await waitFor(() => {
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
