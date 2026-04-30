import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Toggle } from './Toggle'

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the toggle'
    },
    checked: {
      control: 'boolean',
      description: 'Whether the toggle is checked'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the toggle is disabled'
    }
  },
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof Toggle>

/**
 * Interactive toggle with state management
 */
export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked || false)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  },
  args: {
    label: 'Enable feature'
  }
}

/**
 * Toggle without label
 */
export const WithoutLabel: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  }
}

/**
 * Checked state
 */
export const Checked: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  },
  args: {
    label: 'Feature enabled'
  }
}

/**
 * Disabled state (unchecked)
 */
export const DisabledUnchecked: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  },
  args: {
    label: 'Disabled feature',
    disabled: true
  }
}

/**
 * Disabled state (checked)
 */
export const DisabledChecked: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true)
    return <Toggle {...args} checked={checked} onChange={setChecked} />
  },
  args: {
    label: 'Disabled feature',
    disabled: true
  }
}

/**
 * Multiple toggles in a settings-like layout
 */
export const SettingsGroup: Story = {
  render: () => {
    const [notifications, setNotifications] = useState(true)
    const [autoSave, setAutoSave] = useState(false)
    const [darkMode, setDarkMode] = useState(true)
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
        padding: '1rem',
        background: 'var(--panel-bg)',
        borderRadius: '8px',
        minWidth: '300px'
      }}>
        <Toggle
          label="Enable notifications"
          checked={notifications}
          onChange={setNotifications}
        />
        <Toggle
          label="Auto-save changes"
          checked={autoSave}
          onChange={setAutoSave}
        />
        <Toggle
          label="Dark mode"
          checked={darkMode}
          onChange={setDarkMode}
        />
      </div>
    )
  }
}

/**
 * Toggle with long label text
 */
export const LongLabel: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return (
      <div style={{ maxWidth: '400px' }}>
        <Toggle {...args} checked={checked} onChange={setChecked} />
      </div>
    )
  },
  args: {
    label: 'Enable advanced features including automatic synchronization, real-time updates, and enhanced security protocols'
  }
}
