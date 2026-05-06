import type { Meta, StoryObj } from '@storybook/react';
import { Toolbar, ToolbarButton } from './index';
import { TbDeviceFloppy, TbFolderOpen, TbPlayerPlay, TbSettings } from 'react-icons/tb';
import './Toolbar.css';

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    brand: 'Sessionry',
    ariaLabel: 'Main actions',
    children: (
      <>
        <ToolbarButton onClick={() => console.log('Save')} tooltip="Save file">
          <TbDeviceFloppy size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Open')} tooltip="Open file">
          <TbFolderOpen size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Run')} tooltip="Run command">
          <TbPlayerPlay size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Settings')} tooltip="Settings">
          <TbSettings size={15} />
        </ToolbarButton>
      </>
    )
  }
};

export const WithoutBrand: Story = {
  args: {
    ariaLabel: 'Actions',
    children: (
      <>
        <ToolbarButton onClick={() => console.log('Save')} tooltip="Save">
          <TbDeviceFloppy size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Open')} tooltip="Open">
          <TbFolderOpen size={15} />
        </ToolbarButton>
      </>
    )
  }
};

export const WithTextButtons: Story = {
  args: {
    brand: 'My App',
    children: (
      <>
        <ToolbarButton onClick={() => console.log('Save')} tooltip="Save your work">
          Save
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Open')} tooltip="Open a file">
          Open
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Run')} tooltip="Run the command">
          Run
        </ToolbarButton>
      </>
    )
  }
};

export const WithDisabledButton: Story = {
  args: {
    brand: 'Sessionry',
    children: (
      <>
        <ToolbarButton onClick={() => console.log('Save')} tooltip="Save file">
          <TbDeviceFloppy size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Open')} tooltip="Open file" disabled>
          <TbFolderOpen size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => console.log('Run')} tooltip="Run command">
          <TbPlayerPlay size={15} />
        </ToolbarButton>
      </>
    )
  }
};
