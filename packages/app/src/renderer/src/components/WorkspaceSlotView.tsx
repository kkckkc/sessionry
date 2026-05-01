import type { WorkspaceViewProps } from '@sessionry/plugin-api'
import { resolveActiveView } from '@sessionry/plugin-api'
import { PluginSurface } from './PluginSurface'

interface WorkspaceSlotViewProps extends WorkspaceViewProps {
  selectedViewId?: string
  preferredViewId?: string
}

export const WorkspaceSlotView = ({
  plugins,
  selectedViewId,
  preferredViewId,
  ...viewProps
}: WorkspaceSlotViewProps) => {
  const activeView = resolveActiveView(plugins, 'workspace', selectedViewId, preferredViewId)
  if (!activeView) {
    return <section className="workspace-empty">No workspace view registered.</section>
  }

  const registration = viewProps.resolveRendererView(activeView.id)
  if (!registration) {
    return <section className="workspace-empty">Workspace view renderer not found.</section>
  }

  const Component = registration.component
  return (
    <PluginSurface
      pluginId={activeView.pluginId}
      surface="workspace"
      slot={activeView.slot}
      viewId={activeView.id}
    >
      <Component {...viewProps} plugins={plugins} />
    </PluginSurface>
  )
}
