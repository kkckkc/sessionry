import { Tabs } from '@base-ui/react/tabs'
import './TabBar.css'

export interface TabBarItem {
  label: string
  value: string
  onClose?: () => void
}

export interface TabBarProps {
  /**
   * The list of tabs to display.
   */
  items: TabBarItem[]

  /**
   * Visual variant of the tab bar.
   */
  variant: 'primary'

  /**
   * Accessible label for the tab list.
   */
  ariaLabel?: string
}

/**
 * A tab bar for switching between panes in a stacked pane group.
 * Renders only the tabs — the add button and action buttons are outside this component.
 *
 * Must be used inside a `Tabs.Root` (from `@base-ui/react/tabs`).
 *
 * @example
 * ```tsx
 * <Tabs.Root value={activeId} onValueChange={setActiveId}>
 *   <TabBar
 *     variant="primary"
 *     ariaLabel="Terminal tabs"
 *     items={[
 *       { label: 'Terminal 1', value: 'pane-1', onClose: () => removePane('pane-1') },
 *       { label: 'Terminal 2', value: 'pane-2', onClose: () => removePane('pane-2') },
 *     ]}
 *   />
 * </Tabs.Root>
 * ```
 */
export const TabBar = ({ items, variant, ariaLabel }: TabBarProps) => {
  return (
    <Tabs.List className={`tab-bar tab-bar--${variant}`} aria-label={ariaLabel}>
      {items.map((item) => (
        <Tabs.Tab key={item.value} value={item.value} className="tab">
          <span>{item.label}</span>
          {item.onClose && (
            <span
              className="tab-close"
              role="button"
              aria-label={`Close ${item.label}`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                item.onClose!()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  item.onClose!()
                }
              }}
            >
              ×
            </span>
          )}
        </Tabs.Tab>
      ))}
    </Tabs.List>
  )
}

TabBar.displayName = 'TabBar'
