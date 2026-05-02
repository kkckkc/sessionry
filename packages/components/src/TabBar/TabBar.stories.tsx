import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { TabBar } from './TabBar'

const meta: Meta<typeof TabBar> = {
  title: 'Components/TabBar',
  component: TabBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  },
  decorators: [
    (Story, ctx) => {
      const [value, setValue] = useState(ctx.args.items?.[0]?.value ?? '')
      return (
        <Tabs.Root value={value} onValueChange={setValue}>
          <Story />
        </Tabs.Root>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof TabBar>

/**
 * Two tabs — the minimum meaningful use case.
 */
export const Default: Story = {
  args: {
    variant: 'primary',
    ariaLabel: 'Terminal tabs',
    items: [
      { label: 'Terminal 1', value: 'term-1' },
      { label: 'Terminal 2', value: 'term-2' },
    ]
  }
}

/**
 * Tabs with close buttons on each tab.
 */
export const WithCloseButtons: Story = {
  render: (args) => {
    const [items, setItems] = useState(args.items)
    const [value, setValue] = useState(args.items[0]?.value ?? '')

    const handleClose = (valueToRemove: string) => {
      const next = items.filter((item) => item.value !== valueToRemove)
      setItems(next)
      if (value === valueToRemove && next.length > 0) {
        setValue(next[0].value)
      }
    }

    return (
      <Tabs.Root value={value} onValueChange={setValue}>
        <TabBar
          variant="primary"
          ariaLabel="Terminal tabs"
          items={items.map((item) => ({
            ...item,
            onClose: () => handleClose(item.value)
          }))}
        />
      </Tabs.Root>
    )
  },
  args: {
    variant: 'primary',
    items: [
      { label: 'Terminal 1', value: 'term-1' },
      { label: 'Terminal 2', value: 'term-2' },
      { label: 'Terminal 3', value: 'term-3' },
    ]
  }
}

/**
 * Many tabs — shows how the bar handles overflow with flex-shrink.
 */
export const ManyTabs: Story = {
  args: {
    variant: 'primary',
    ariaLabel: 'File tabs',
    items: Array.from({ length: 8 }, (_, i) => ({
      label: `Tab ${i + 1}`,
      value: `tab-${i + 1}`
    }))
  }
}

/**
 * Single tab — edge case where there is only one pane in the group.
 */
export const SingleTab: Story = {
  args: {
    variant: 'primary',
    ariaLabel: 'Terminal tabs',
    items: [
      { label: 'Terminal', value: 'term-1' }
    ]
  }
}
