import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Menu } from './Menu';

describe('Menu', () => {
  it('stays open when the pointer leaves the popup', () => {
    const onOpenChange = vi.fn();

    render(
      <Menu.Root open onOpenChange={onOpenChange}>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item>Rename</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );

    fireEvent.mouseLeave(screen.getByRole('menu'), {
      relatedTarget: document.body
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
