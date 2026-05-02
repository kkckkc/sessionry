import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

const meta: Meta<typeof SegmentedControl> = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The currently selected value'
    }
  },
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof SegmentedControl>

/**
 * Basic interactive segmented control
 */
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState('dark')
    return <SegmentedControl {...args} value={value} onChange={setValue} />
  },
  args: {
    items: [
      { label: 'Dark', value: 'dark' },
      { label: 'Midnight', value: 'midnight' },
      { label: 'Warm', value: 'warm' },
    ]
  }
}

/**
 * Two-option toggle — a common use case for light/dark mode
 */
export const TwoOptions: Story = {
  render: () => {
    const [value, setValue] = useState('light')
    return (
      <SegmentedControl
        items={[
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  }
}

/**
 * Four options — e.g. a view mode selector
 */
export const FourOptions: Story = {
  render: () => {
    const [value, setValue] = useState('day')
    return (
      <SegmentedControl
        items={[
          { label: 'Day', value: 'day' },
          { label: 'Week', value: 'week' },
          { label: 'Month', value: 'month' },
          { label: 'Year', value: 'year' },
        ]}
        value={value}
        onChange={setValue}
      />
    )
  }
}

/**
 * Used inside a settings-like panel — shows how it sits in context
 */
export const InSettingsPanel: Story = {
  render: () => {
    const [theme, setTheme] = useState('system')
    const [density, setDensity] = useState('default')

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem',
        background: 'var(--panel-bg)',
        borderRadius: '8px',
        minWidth: '320px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: 'var(--body-sm-font-size)', color: 'var(--text-muted)' }}>Theme</span>
          <SegmentedControl
            items={[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'System', value: 'system' },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: 'var(--body-sm-font-size)', color: 'var(--text-muted)' }}>Density</span>
          <SegmentedControl
            items={[
              { label: 'Compact', value: 'compact' },
              { label: 'Default', value: 'default' },
              { label: 'Comfortable', value: 'comfortable' },
            ]}
            value={density}
            onChange={setDensity}
          />
        </div>
      </div>
    )
  }
}
