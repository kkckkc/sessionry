import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Select } from './Select'
import './Select.css'

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the select'
    },
    description: {
      control: 'text',
      description: 'Description text shown below the select'
    },
    error: {
      control: 'text',
      description: 'Error message to display'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled'
    }
  },
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof Select>

const themeOptions = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
  { value: 'auto', label: 'Auto (System)' }
]

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' }
]

const fontSizeOptions = [
  { value: '12', label: '12px - Small' },
  { value: '14', label: '14px - Medium' },
  { value: '16', label: '16px - Large' },
  { value: '18', label: '18px - Extra Large' }
]

/**
 * Basic select with label
 */
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState('dark')
    return (
      <div style={{ minWidth: '300px' }}>
        <Select 
          {...args} 
          options={themeOptions}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  },
  args: {
    label: 'Theme'
  }
}

/**
 * Select with description text
 */
export const WithDescription: Story = {
  render: (args) => {
    const [value, setValue] = useState('en')
    return (
      <div style={{ minWidth: '300px' }}>
        <Select 
          {...args} 
          options={languageOptions}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  },
  args: {
    label: 'Language',
    description: 'Choose your preferred language for the interface'
  }
}

/**
 * Select with error state
 */
export const WithError: Story = {
  render: (args) => {
    const [value, setValue] = useState('')
    return (
      <div style={{ minWidth: '300px' }}>
        <Select 
          {...args} 
          options={[
            { value: '', label: 'Select an option...' },
            ...themeOptions
          ]}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  },
  args: {
    label: 'Theme',
    error: 'Please select a theme'
  }
}

/**
 * Disabled select
 */
export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState('dark')
    return (
      <div style={{ minWidth: '300px' }}>
        <Select 
          {...args} 
          options={themeOptions}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  },
  args: {
    label: 'Theme',
    disabled: true
  }
}

/**
 * Select without label
 */
export const WithoutLabel: Story = {
  render: (args) => {
    const [value, setValue] = useState('14')
    return (
      <div style={{ minWidth: '200px' }}>
        <Select 
          {...args} 
          options={fontSizeOptions}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  }
}

/**
 * Multiple selects in a settings form
 */
export const SettingsForm: Story = {
  render: () => {
    const [theme, setTheme] = useState('dark')
    const [language, setLanguage] = useState('en')
    const [fontSize, setFontSize] = useState('14')
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
        padding: '1.5rem',
        background: 'var(--panel-bg)',
        borderRadius: '8px',
        minWidth: '400px'
      }}>
        <Select
          label="Theme"
          description="Choose your preferred color theme"
          options={themeOptions}
          value={theme}
          onChange={setTheme}
        />
        <Select
          label="Language"
          description="Select your interface language"
          options={languageOptions}
          value={language}
          onChange={setLanguage}
        />
        <Select
          label="Font Size"
          description="Adjust the text size for better readability"
          options={fontSizeOptions}
          value={fontSize}
          onChange={setFontSize}
        />
      </div>
    )
  }
}

/**
 * Select with many options
 */
export const ManyOptions: Story = {
  render: (args) => {
    const [value, setValue] = useState('us')
    const countryOptions = [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'ca', label: 'Canada' },
      { value: 'au', label: 'Australia' },
      { value: 'de', label: 'Germany' },
      { value: 'fr', label: 'France' },
      { value: 'es', label: 'Spain' },
      { value: 'it', label: 'Italy' },
      { value: 'jp', label: 'Japan' },
      { value: 'cn', label: 'China' },
      { value: 'in', label: 'India' },
      { value: 'br', label: 'Brazil' }
    ]
    
    return (
      <div style={{ minWidth: '300px' }}>
        <Select 
          {...args} 
          options={countryOptions}
          value={value} 
          onChange={setValue} 
        />
      </div>
    )
  },
  args: {
    label: 'Country',
    description: 'Select your country'
  }
}
