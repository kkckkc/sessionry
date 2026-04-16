import type { AppPlugin, PluginViewModel, SidebarPanelContribution } from './plugins'

export const normalizePlugins = (plugins: AppPlugin[]): PluginViewModel => {
  const toolbar = plugins.flatMap((plugin) => plugin.toolbar ?? [])
  const panels = plugins.flatMap((plugin) => plugin.panels ?? [])
  const statusItems = plugins.flatMap((plugin) => plugin.statusItems ?? [])

  const sortPanels = (side: SidebarPanelContribution['side']) =>
    panels.filter((panel) => panel.side === side).sort((a, b) => a.title.localeCompare(b.title))

  return {
    toolbar,
    leftPanels: sortPanels('left'),
    rightPanels: sortPanels('right'),
    statusItems
  }
}
