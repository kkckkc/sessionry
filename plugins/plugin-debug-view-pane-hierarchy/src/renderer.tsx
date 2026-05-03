import React, { useEffect, useState } from 'react'
import type { PaneGroupChild, RendererAppPlugin, WorkspaceApi } from '@sessionry/plugin-api'
import './styles.css'
import { plugin as paneHierarchyDebugPlugin } from '.'

interface PaneHierarchyViewProps {
  workspace: WorkspaceApi
}

export const PaneHierarchyView: React.FC<PaneHierarchyViewProps> = ({ workspace }) => {
  const [, setRefreshKey] = useState(0)

  useEffect(() => {
    return workspace.subscribeAll(() => setRefreshKey((k) => k + 1))
  }, [workspace])

  const snapshot = workspace.snapshot
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find((s: any) => s.id === snapshot.activeSessionId)
    : snapshot.sessions[0]

  if (!activeSession) {
    return (
      <div className="pane-hierarchy-view">
        <pre className="tree-output">No active session</pre>
      </div>
    )
  }

  const rootGroup = snapshot.paneGroups.find((g: any) => g.id === activeSession.rootPaneGroupId)
  if (!rootGroup) {
    return (
      <div className="pane-hierarchy-view">
        <pre className="tree-output">No root pane group</pre>
      </div>
    )
  }

  const paneById = new Map(snapshot.panes.map((p: any) => [p.id, p]))
  const groupById = new Map(snapshot.paneGroups.map((g: any) => [g.id, g]))

  const lines: string[] = []
  
  // Helper to truncate text to fit width
  const truncate = (text: string, maxLen: number): string => {
    return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text
  }

  const renderNode = (child: PaneGroupChild, prefix: string, isLast: boolean): void => {
    const connector = isLast ? '└─' : '├─'
    const childPrefix = isLast ? '  ' : '│ '

    if (child.kind === 'pane') {
      const pane: any = paneById.get(child.paneId)
      if (!pane) return

      const title = (pane.state as any)?.title || pane.type
      const shortId = child.paneId.substring(0, 8)
      const size = pane.preferredSizePct ?? 0
      
      // Format: "├─P:12345678 (title) 50%"
      const line = `${prefix}${connector}P:${shortId}`
      const titlePart = ` (${truncate(title, 15)})`
      const sizePart = ` ${size}%`
      const fullLine = truncate(line + titlePart + sizePart, 38)
      
      lines.push(fullLine)
      return
    }

    const group: any = groupById.get(child.paneGroupId)
    if (!group) return

    const shortId = child.paneGroupId.substring(0, 8)
    const dirChar = group.direction === 'horizontal' ? 'H' : 
                    group.direction === 'vertical' ? 'V' : 'S'
    const size = group.preferredSizePct ?? 0
    
    // Format: "├─G:12345678 [H] 50%"
    const line = `${prefix}${connector}G:${shortId} [${dirChar}]`
    const sizePart = ` ${size}%`
    const fullLine = truncate(line + sizePart, 38)
    
    lines.push(fullLine)

    // Render children
    const newPrefix = prefix + childPrefix
    group.children.forEach((c: any, i: number) => {
      renderNode(c, newPrefix, i === group.children.length - 1)
    })
  }

  // Build the tree
  const sessionLine = truncate(`Session: ${activeSession.name}`, 38)
  lines.push(sessionLine)
  lines.push('─'.repeat(38))
  
  const rootId = rootGroup.id.substring(0, 8)
  const rootDir = rootGroup.direction === 'horizontal' ? 'H' : 
                  rootGroup.direction === 'vertical' ? 'V' : 'S'
  lines.push(`Root:${rootId} [${rootDir}]`)
  
  rootGroup.children.forEach((child: any, i: number) => {
    renderNode(child, '', i === rootGroup.children.length - 1)
  })

  return (
    <div className="pane-hierarchy-view">
      <pre className="tree-output">{lines.join('\n')}</pre>
    </div>
  )
}

const paneHierarchyView = paneHierarchyDebugPlugin.views?.[0]

if (!paneHierarchyView) {
  throw new Error('paneHierarchyDebugPlugin must register a sidebar view.')
}

export const debugPaneHierarchyRendererPlugin: RendererAppPlugin = {
  id: paneHierarchyDebugPlugin.id,
  name: paneHierarchyDebugPlugin.name,
  views: [
    {
      ...paneHierarchyView,
      component: PaneHierarchyView
    }
  ]
}

export default debugPaneHierarchyRendererPlugin
