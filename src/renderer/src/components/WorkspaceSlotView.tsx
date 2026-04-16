import type { PluginViewModel, WorkspaceViewProps } from '@shared/plugins'
import { resolveActiveView } from '@shared/pluginRegistry'

import { getRendererView } from '../plugins'

interface WorkspaceSlotViewProps extends WorkspaceViewProps {
  plugins: PluginViewModel
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

  const registration = getRendererView(activeView.id)
  if (!registration) {
    return <section className="workspace-empty">Workspace view renderer not found.</section>
  }

  const Component = registration.component
  return <Component {...viewProps} />
}
