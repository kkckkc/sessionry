import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Section } from './Section'
import { Toggle } from '../Toggle'
import { Input } from '../Input'
import { Select } from '../Select'

const meta: Meta<typeof Section> = {
  title: 'Components/Section',
  component: Section,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Section title (displayed as uppercase label)'
    },
    description: {
      control: 'text',
      description: 'Optional description text'
    }
  },
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof Section>

/**
 * Basic section with title only
 */
export const Default: Story = {
  args: {
    title: 'General Settings',
    children: (
      <div style={{ padding: '1rem', background: 'var(--panel-bg-soft)', borderRadius: '4px' }}>
        Section content goes here
      </div>
    )
  }
}

/**
 * Section with title and description
 */
export const WithDescription: Story = {
  args: {
    title: 'Appearance',
    description: 'Customize the look and feel of the application',
    children: (
      <div style={{ padding: '1rem', background: 'var(--panel-bg-soft)', borderRadius: '4px' }}>
        Section content goes here
      </div>
    )
  }
}

/**
 * Section with Toggle controls
 */
export const WithToggles: Story = {
  render: () => {
    const [notifications, setNotifications] = useState(true)
    const [autoSave, setAutoSave] = useState(false)
    const [analytics, setAnalytics] = useState(true)
    
    return (
      <div style={{ minWidth: '400px' }}>
        <Section 
          title="Preferences" 
          description="Configure your application preferences"
        >
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
            label="Send anonymous analytics"
            checked={analytics}
            onChange={setAnalytics}
          />
        </Section>
      </div>
    )
  }
}

/**
 * Section with Input controls
 */
export const WithInputs: Story = {
  render: () => {
    const [name, setName] = useState('My Project')
    const [author, setAuthor] = useState('John Doe')
    const [version, setVersion] = useState('1.0.0')
    
    return (
      <div style={{ minWidth: '400px' }}>
        <Section 
          title="Project Information" 
          description="Basic details about your project"
        >
          <Input
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <Input
            label="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
          />
        </Section>
      </div>
    )
  }
}

/**
 * Section with Select controls
 */
export const WithSelects: Story = {
  render: () => {
    const [theme, setTheme] = useState('dark')
    const [language, setLanguage] = useState('en')
    
    const themeOptions = [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'Auto' }
    ]
    
    const languageOptions = [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' }
    ]
    
    return (
      <div style={{ minWidth: '400px' }}>
        <Section 
          title="Display" 
          description="Customize how the application looks"
        >
          <Select
            label="Theme"
            options={themeOptions}
            value={theme}
            onChange={setTheme}
          />
          <Select
            label="Language"
            options={languageOptions}
            value={language}
            onChange={setLanguage}
          />
        </Section>
      </div>
    )
  }
}

/**
 * Section with mixed controls
 */
export const MixedControls: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(true)
    const [port, setPort] = useState('3000')
    const [protocol, setProtocol] = useState('http')
    
    const protocolOptions = [
      { value: 'http', label: 'HTTP' },
      { value: 'https', label: 'HTTPS' }
    ]
    
    return (
      <div style={{ minWidth: '400px' }}>
        <Section 
          title="Server Configuration" 
          description="Configure your development server settings"
        >
          <Toggle
            label="Enable development server"
            checked={enabled}
            onChange={setEnabled}
          />
          <Select
            label="Protocol"
            options={protocolOptions}
            value={protocol}
            onChange={setProtocol}
            disabled={!enabled}
          />
          <Input
            type="number"
            label="Port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={!enabled}
            description="Port number between 1024 and 65535"
          />
        </Section>
      </div>
    )
  }
}

/**
 * Multiple sections in a settings page
 */
export const MultipleSection: Story = {
  render: () => {
    const [darkMode, setDarkMode] = useState(true)
    const [notifications, setNotifications] = useState(true)
    const [name, setName] = useState('John Doe')
    const [email, setEmail] = useState('john@example.com')
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem',
        padding: '1.5rem',
        background: 'var(--panel-bg)',
        borderRadius: '8px',
        minWidth: '500px'
      }}>
        <Section 
          title="Appearance" 
          description="Customize the look and feel"
        >
          <Toggle
            label="Dark mode"
            checked={darkMode}
            onChange={setDarkMode}
          />
        </Section>
        
        <Section 
          title="Notifications" 
          description="Manage notification preferences"
        >
          <Toggle
            label="Enable notifications"
            checked={notifications}
            onChange={setNotifications}
          />
        </Section>
        
        <Section 
          title="Profile" 
          description="Your personal information"
        >
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Section>
      </div>
    )
  }
}
