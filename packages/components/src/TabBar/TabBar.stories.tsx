import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { FiFileText, FiFolder, FiSearch } from 'react-icons/fi';
import { TabBar } from './TabBar';

const renderWithSelectedTab = (args: ComponentProps<typeof TabBar>) => {
  const initialValue = args.items[1]?.value ?? args.items[0]?.value ?? '';
  const [selectedValue, setSelectedValue] = useState(initialValue);

  return (
    <Tabs.Root value={selectedValue} onValueChange={setSelectedValue}>
      <TabBar {...args} value={selectedValue} onValueChange={setSelectedValue} />
    </Tabs.Root>
  );
};

const meta: Meta<typeof TabBar> = {
  title: 'Components/TabBar',
  component: TabBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
};

export default meta;
type Story = StoryObj<typeof TabBar>;

/**
 * Two tabs — the minimum meaningful use case.
 */
export const Primary: Story = {
  render: renderWithSelectedTab,
  args: {
    variant: 'primary',
    ariaLabel: 'Terminal tabs',
    items: [
      { label: 'Terminal 1', value: 'term-1' },
      { label: 'Terminal 2', value: 'term-2' }
    ]
  }
};

/**
 * Secondary variant with sidebar background and borderless selected tab.
 */
export const Secondary: Story = {
  render: renderWithSelectedTab,
  args: {
    variant: 'secondary',
    ariaLabel: 'Sidebar tabs',
    items: [
      { label: 'Explorer', value: 'explorer' },
      { label: 'Search', value: 'search' },
      { label: 'Source Control', value: 'source-control' }
    ]
  }
};

/**
 * Tabs can show icons before their labels.
 */
export const WithIcons: Story = {
  render: renderWithSelectedTab,
  args: {
    variant: 'primary',
    ariaLabel: 'Workspace tabs',
    items: [
      { label: 'Files', value: 'files', icon: <FiFolder /> },
      { label: 'Search', value: 'search', icon: <FiSearch /> },
      { label: 'Notes', value: 'notes', icon: <FiFileText /> }
    ]
  }
};

/**
 * Tabs with close buttons on each tab.
 */
export const WithCloseButtons: Story = {
  render: args => {
    const [items, setItems] = useState(args.items);
    const [value, setValue] = useState(args.items[1]?.value ?? args.items[0]?.value ?? '');

    const handleClose = (valueToRemove: string) => {
      const next = items.filter(item => item.value !== valueToRemove);
      setItems(next);
      if (value === valueToRemove && next.length > 0) {
        setValue(next[0].value);
      }
    };

    return (
      <Tabs.Root value={value} onValueChange={setValue}>
        <TabBar
          variant={args.variant}
          value={value}
          onValueChange={setValue}
          ariaLabel={args.ariaLabel}
          items={items.map(item => ({
            ...item,
            onClose: () => handleClose(item.value)
          }))}
        />
      </Tabs.Root>
    );
  },
  args: {
    variant: 'primary',
    ariaLabel: 'Terminal tabs',
    items: [
      { label: 'Terminal 1', value: 'term-1' },
      { label: 'Terminal 2', value: 'term-2' },
      { label: 'Terminal 3', value: 'term-3' }
    ]
  }
};

/**
 * Many tabs — shows how the bar handles overflow with flex-shrink.
 */
export const ManyTabs: Story = {
  render: renderWithSelectedTab,
  args: {
    variant: 'primary',
    ariaLabel: 'File tabs',
    items: Array.from({ length: 8 }, (_, i) => ({
      label: `Tab ${i + 1}`,
      value: `tab-${i + 1}`
    }))
  }
};

/**
 * Single tab — edge case where there is only one pane in the group.
 */
export const SingleTab: Story = {
  render: renderWithSelectedTab,
  args: {
    variant: 'primary',
    ariaLabel: 'Terminal tabs',
    items: [{ label: 'Terminal', value: 'term-1' }]
  }
};
