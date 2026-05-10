import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Menu } from './Menu';

const meta = {
  title: 'Components/Menu',
  component: Menu.Root,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof Menu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic context menu example
 */
export const ContextMenu: Story = {
  render: () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    return (
      <div style={{ padding: '2rem' }}>
        <div
          style={{
            padding: '2rem',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'center'
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setAnchorEl(e.currentTarget);
            setMenuOpen(true);
          }}
        >
          Right-click me to open menu
        </div>

        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Portal>
            <Menu.Positioner
              anchor={
                anchorEl
                  ? { getBoundingClientRect: () => anchorEl.getBoundingClientRect() }
                  : undefined
              }
            >
              <Menu.Popup>
                <Menu.Item onClick={() => console.log('Edit clicked')}>
                  Edit
                </Menu.Item>
                <Menu.Item onClick={() => console.log('Duplicate clicked')}>
                  Duplicate
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => console.log('Delete clicked')} danger>
                  Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    );
  }
};

/**
 * Menu with disabled items
 */
export const WithDisabledItems: Story = {
  render: () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    return (
      <div style={{ padding: '2rem' }}>
        <button
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--button-bg)',
            color: 'var(--text)',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setMenuOpen(true);
          }}
        >
          Open Menu
        </button>

        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Portal>
            <Menu.Positioner
              anchor={
                anchorEl
                  ? { getBoundingClientRect: () => anchorEl.getBoundingClientRect() }
                  : undefined
              }
            >
              <Menu.Popup>
                <Menu.Item onClick={() => console.log('Copy clicked')}>
                  Copy
                </Menu.Item>
                <Menu.Item onClick={() => console.log('Cut clicked')} disabled>
                  Cut (disabled)
                </Menu.Item>
                <Menu.Item onClick={() => console.log('Paste clicked')}>
                  Paste
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    );
  }
};

/**
 * Menu with multiple sections
 */
export const WithSections: Story = {
  render: () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    return (
      <div style={{ padding: '2rem' }}>
        <button
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--button-bg)',
            color: 'var(--text)',
            cursor: 'pointer'
          }}
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setMenuOpen(true);
          }}
        >
          File Menu
        </button>

        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Portal>
            <Menu.Positioner
              anchor={
                anchorEl
                  ? { getBoundingClientRect: () => anchorEl.getBoundingClientRect() }
                  : undefined
              }
            >
              <Menu.Popup>
                <Menu.Item onClick={() => console.log('New clicked')}>
                  New File
                </Menu.Item>
                <Menu.Item onClick={() => console.log('Open clicked')}>
                  Open File
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => console.log('Save clicked')}>
                  Save
                </Menu.Item>
                <Menu.Item onClick={() => console.log('Save As clicked')}>
                  Save As...
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => console.log('Close clicked')} danger>
                  Close
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    );
  }
};
