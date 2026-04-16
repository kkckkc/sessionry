import type {
  AppPlugin,
  PluginViewModel,
  PluginViewContribution,
  PluginViewDefinition,
  PluginViewSlotId,
  SidebarPanelContribution
} from './plugins'

export const normalizePlugins = (plugins: AppPlugin[]): PluginViewModel => {
  const actions = plugins.flatMap((plugin) =>
    (plugin.actions ?? []).map(({ run: _run, ...action }) => action)
  )
  const panels = plugins.flatMap((plugin) => plugin.panels ?? [])
  const statusItems = plugins.flatMap((plugin) => plugin.statusItems ?? [])
  const views = plugins.flatMap((plugin) =>
    (plugin.views ?? []).map<PluginViewContribution>((view: PluginViewDefinition) => ({
      ...view,
      pluginId: plugin.id
    }))
  )

  const sortPanels = (side: SidebarPanelContribution['side']) =>
    panels.filter((panel) => panel.side === side).sort((a, b) => a.title.localeCompare(b.title))

  const viewsBySlot = Object.fromEntries(
    views.reduce<Map<string, PluginViewContribution[]>>((groups, view) => {
      const group = groups.get(view.slot) ?? []
      group.push(view)
      groups.set(view.slot, group)
      return groups
    }, new Map()).entries()
  )

  return {
    actions,
    toolbarActionIds: actions.filter((action) => action.surfaces?.includes('toolbar')).map((action) => action.id),
    leftPanels: sortPanels('left'),
    rightPanels: sortPanels('right'),
    statusItems,
    viewsBySlot
  }
}

export const getViewsForSlot = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId
): PluginViewContribution[] => plugins.viewsBySlot[slot] ?? []

export const resolveActiveView = (
  plugins: PluginViewModel,
  slot: PluginViewSlotId,
  selectedViewId?: string,
  preferredViewId?: string
): PluginViewContribution | null => {
  const views = getViewsForSlot(plugins, slot)
  if (views.length === 0) return null

  const viewById = new Map(views.map((view) => [view.id, view]))

  if (selectedViewId && viewById.has(selectedViewId)) {
    return viewById.get(selectedViewId) ?? null
  }

  if (preferredViewId && viewById.has(preferredViewId)) {
    return viewById.get(preferredViewId) ?? null
  }

  return views.find((view) => view.isDefault) ?? views[0] ?? null
}
