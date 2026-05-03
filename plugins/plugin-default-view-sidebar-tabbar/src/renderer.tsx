import { useEffect, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { TabBar } from '@sessionry/components'
import {
  resolveChildViewForSlot,
  type MultiViewProps,
  type RendererAppPlugin
} from '@sessionry/plugin-api'
import './styles.css'

import { sidebarTabBarPlugin } from '.'

const resolveActiveChildViewId = ({
  plugins,
  slot,
  selectedViewId,
  preferredViewId
}: Pick<MultiViewProps, 'plugins' | 'slot' | 'selectedViewId' | 'preferredViewId'>): string | null =>
  resolveChildViewForSlot(plugins, slot, selectedViewId, preferredViewId)?.id ?? null

const SidebarTabBarView = ({
  plugins,
  workspace,
  resolveRendererView,
  slot,
  childViews,
  selectedViewId,
  preferredViewId
}: MultiViewProps) => {
  const [activeChildViewId, setActiveChildViewId] = useState<string | null>(() =>
    resolveActiveChildViewId({ plugins, slot, selectedViewId, preferredViewId })
  )

  useEffect(() => {
    if (childViews.some((view) => view.id === activeChildViewId)) return
    setActiveChildViewId(resolveActiveChildViewId({ plugins, slot, selectedViewId, preferredViewId }))
  }, [activeChildViewId, childViews, plugins, preferredViewId, selectedViewId, slot])

  const activeChildView =
    childViews.find((view) => view.id === activeChildViewId) ??
    resolveChildViewForSlot(plugins, slot, selectedViewId, preferredViewId)

  if (childViews.length === 0 || !activeChildView) {
    return <section className="sidebar-tabbar-view__empty">No sidebar views available.</section>
  }

  const activeChildRegistration = resolveRendererView(activeChildView.id)
  const ActiveChildComponent = activeChildRegistration?.component

  return (
    <Tabs.Root value={activeChildView.id} onValueChange={setActiveChildViewId}>
      <div className="sidebar-tabbar-view">
        <TabBar
          variant="secondary"
          ariaLabel="Sidebar views"
          items={childViews.map((view) => ({
            label: view.title,
            value: view.id
          }))}
        />
        <div className="sidebar-tabbar-view__panel">
          {ActiveChildComponent ? (
            <ActiveChildComponent
              plugins={plugins}
              workspace={workspace}
              resolveRendererView={resolveRendererView}
            />
          ) : (
            <section className="sidebar-tabbar-view__empty">Sidebar view renderer not found.</section>
          )}
        </div>
      </div>
    </Tabs.Root>
  )
}

const sidebarTabBarView = sidebarTabBarPlugin.views?.[0]

if (!sidebarTabBarView) {
  throw new Error('sidebarTabBarPlugin must register a sidebar view.')
}

export const sidebarTabBarRendererPlugin: RendererAppPlugin = {
  id: sidebarTabBarPlugin.id,
  name: sidebarTabBarPlugin.name,
  viewMode: sidebarTabBarPlugin.viewMode,
  views: [
    {
      ...sidebarTabBarView,
      component: SidebarTabBarView
    }
  ]
}

export default sidebarTabBarRendererPlugin
