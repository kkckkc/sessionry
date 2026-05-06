import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Input } from './Input';
import './Input.css';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the input'
    },
    description: {
      control: 'text',
      description: 'Description text shown below the input'
    },
    error: {
      control: 'text',
      description: 'Error message to display'
    },
    type: {
      control: 'select',
      options: ['text', 'number', 'email', 'password', 'url', 'tel'],
      description: 'Input type'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled'
    }
  },
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof Input>;

/**
 * Basic text input with label
 */
export const Default: Story = {
  render: args => {
    const [value, setValue] = useState('');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    label: 'Username',
    placeholder: 'Enter your username'
  }
};

/**
 * Input with description text
 */
export const WithDescription: Story = {
  render: args => {
    const [value, setValue] = useState('');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    label: 'API Key',
    placeholder: 'sk-...',
    description: 'Your API key can be found in the settings panel'
  }
};

/**
 * Number input type
 */
export const NumberInput: Story = {
  render: args => {
    const [value, setValue] = useState('3000');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    type: 'number',
    label: 'Port',
    description: 'Port number for the development server'
  }
};

/**
 * Email input type
 */
export const EmailInput: Story = {
  render: args => {
    const [value, setValue] = useState('');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    type: 'email',
    label: 'Email',
    placeholder: 'user@example.com'
  }
};

/**
 * Password input type
 */
export const PasswordInput: Story = {
  render: args => {
    const [value, setValue] = useState('');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password'
  }
};

/**
 * Input with error state
 */
export const WithError: Story = {
  render: args => {
    const [value, setValue] = useState('invalid-email');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    type: 'email',
    label: 'Email',
    error: 'Please enter a valid email address'
  }
};

/**
 * Disabled input
 */
export const Disabled: Story = {
  render: args => {
    const [value, setValue] = useState('Cannot edit this');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    label: 'Read-only field',
    disabled: true
  }
};

/**
 * Input without label
 */
export const WithoutLabel: Story = {
  render: args => {
    const [value, setValue] = useState('');
    return (
      <div style={{ minWidth: '300px' }}>
        <Input {...args} value={value} onChange={e => setValue(e.target.value)} />
      </div>
    );
  },
  args: {
    placeholder: 'Search...'
  }
};

/**
 * Form with multiple inputs
 */
export const FormExample: Story = {
  render: () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [port, setPort] = useState('3000');

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem',
          background: 'var(--panel-bg)',
          borderRadius: '8px',
          minWidth: '400px'
        }}
      >
        <Input
          label="Project Name"
          placeholder="my-awesome-project"
          value={name}
          onChange={e => setName(e.target.value)}
          description="Choose a unique name for your project"
        />
        <Input
          type="email"
          label="Email"
          placeholder="user@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          type="number"
          label="Port"
          value={port}
          onChange={e => setPort(e.target.value)}
          description="Port number between 1024 and 65535"
        />
      </div>
    );
  }
};
