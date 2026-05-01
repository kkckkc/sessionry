import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import './Button.css'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'ghost'],
      description: 'Button variant style'
    },
    tooltip: {
      control: 'text',
      description: 'Tooltip text shown on hover'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled'
    }
  },
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof Button>

/**
 * Default button with standard styling
 */
export const Default: Story = {
  args: {
    children: 'Click me'
  }
}

/**
 * Ghost variant with transparent background
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button'
  }
}

/**
 * Button with tooltip that appears on hover
 */
export const WithTooltip: Story = {
  args: {
    children: 'Hover me',
    tooltip: 'This is a helpful tooltip'
  }
}

/**
 * Disabled button state
 */
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true
  }
}

/**
 * Button with icon (using emoji as placeholder)
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <span>⚙️</span>
        <span>Settings</span>
      </>
    ),
    tooltip: 'Open settings'
  }
}

/**
 * Primary variant — accent-filled, for the dominant action
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Confirm'
  }
}

/**
 * Multiple buttons in a group
 */
export const ButtonGroup: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button>Save</Button>
      <Button variant="ghost">Cancel</Button>
      <Button tooltip="Delete item">🗑️</Button>
    </div>
  )
}

/**
 * Buttons in different contexts (using context classes)
 */
export const InContexts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <div className="ctx-chrome" style={{ padding: '1rem', background: 'var(--chrome-bg)' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Chrome Context
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button>Action</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
      </div>
      
      <div className="ctx-workspace" style={{ padding: '1rem', background: 'var(--workspace-bg)' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Workspace Context
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button>Action</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
      </div>
    </div>
  )
}
