import { type ReactNode, useState } from 'react';
import type { IconType } from 'react-icons';
import * as TbIcons from 'react-icons/tb';

import { Toolbar, ToolbarButton } from '@sessionry/components';

import type { ActionDescriptor, PluginViewModel, SidebarViewProps } from '@sessionry/plugin-api';
import type { TerminalSessionInfo } from '@sessionry/plugin-api';
import { getChildViewsForSlot } from '@sessionry/plugin-api';
import { resolveActiveView } from '@sessionry/plugin-api';
import type { RendererViewRegistration } from '@sessionry/plugin-api';
import type { WorkspaceApi } from '@sessionry/plugin-api';

import { resolveStatusValue } from '../lib/pluginPanels';
import { PluginSurface } from './PluginSurface';

interface AppShellProps {
  plugins: PluginViewModel;
  workspace: WorkspaceApi;
  session: TerminalSessionInfo | null;
  leftVisible: boolean;
  rightVisible: boolean;
  statusBarVisible: boolean;
  mainContent: ReactNode;
  onToolbarAction: (actionId: string) => void;
  resolveRendererView: (viewId: string) => RendererViewRegistration | null;
}

const resolveTablerIcon = (name: string): IconType | null => {
  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic icon resolution by name is intentional
  const icon = TbIcons[name as keyof typeof TbIcons];
  return icon ? (icon as IconType) : null;
};

const resolveSidebarRegistration = ({
  side,
  plugins,
  resolveRendererView
}: {
  side: 'left' | 'right';
  plugins: PluginViewModel;
  resolveRendererView: (viewId: string) => RendererViewRegistration | null;
}) => {
  const slotId = `sidebar:${side}`;
  const activeView = resolveActiveView(plugins, slotId);
  if (!activeView) return null;

  return {
    activeView,
    registration: resolveRendererView(activeView.id)
  };
};

const SidebarView = ({
  pluginId,
  slot,
  viewId,
  registration,
  plugins,
  workspace,
  resolveRendererView
}: SidebarViewProps & {
  pluginId: string;
  slot: string;
  viewId: string;
  registration: RendererViewRegistration | null;
}) => {
  if (!registration) return null;

  const Component = registration.component;

  return (
    <PluginSurface pluginId={pluginId} surface="sidebar" slot={slot} viewId={viewId}>
      <Component
        plugins={plugins}
        workspace={workspace}
        resolveRendererView={resolveRendererView}
        slot={slot}
        childViews={getChildViewsForSlot(plugins, slot)}
      />
    </PluginSurface>
  );
};

const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 520;
const RIGHT_EDGE_TOOLBAR_ACTION_IDS = new Set(['layout:toggle-right']);

const resolveToolbarActions = (plugins: PluginViewModel): ActionDescriptor[] => {
  const toolbarActions = plugins.toolbarActionIds
    .map(actionId => plugins.actions.find(candidate => candidate.id === actionId))
    .filter((action): action is ActionDescriptor => action !== undefined);

  return [
    ...toolbarActions.filter(action => !RIGHT_EDGE_TOOLBAR_ACTION_IDS.has(action.id)),
    ...toolbarActions.filter(action => RIGHT_EDGE_TOOLBAR_ACTION_IDS.has(action.id))
  ];
};

const startSidebarResize = (
  side: 'left' | 'right',
  startWidth: number,
  setWidth: (w: number) => void,
  e: React.MouseEvent
) => {
  e.preventDefault();
  const startX = e.clientX;

  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';

  const onMouseMove = (moveEvent: MouseEvent) => {
    const delta = side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
    setWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, startWidth + delta)));
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

export const AppShell = ({
  plugins,
  workspace,
  session,
  leftVisible,
  rightVisible,
  statusBarVisible,
  mainContent,
  onToolbarAction,
  resolveRendererView
}: AppShellProps) => {
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(300);

  const leftSidebarView = resolveSidebarRegistration({
    side: 'left',
    plugins,
    resolveRendererView
  });
  const rightSidebarView = resolveSidebarRegistration({
    side: 'right',
    plugins,
    resolveRendererView
  });
  const leftRegistration = leftSidebarView?.registration ?? null;
  const rightRegistration = rightSidebarView?.registration ?? null;
  const showLeftSidebar = leftVisible;
  const showRightSidebar = rightVisible && rightRegistration !== null;

  const workspaceClassName = [
    'workspace',
    showLeftSidebar ? 'is-left-visible' : 'is-left-hidden',
    showRightSidebar ? 'is-right-visible' : 'is-right-hidden'
  ].join(' ');

  const gridTemplateColumns = [
    showLeftSidebar ? `${leftWidth}px` : null,
    'minmax(0, 1fr)',
    showRightSidebar ? `${rightWidth}px` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app-frame">
      <Toolbar className="app-toolbar" brand="Sessionry" ariaLabel="Application actions">
        {resolveToolbarActions(plugins).map(action => {
          const Icon = action.icon ? resolveTablerIcon(action.icon) : null;
          return (
            <ToolbarButton
              key={action.id}
              onClick={() => onToolbarAction(action.id)}
              tooltip={action.name}
              tooltipDelay={600}
            >
              {Icon ? <Icon size={15} /> : action.name}
            </ToolbarButton>
          );
        })}
      </Toolbar>

      <main className={workspaceClassName} style={{ gridTemplateColumns }}>
        {showLeftSidebar ? (
          <aside className="sidebar sidebar--left">
            <SidebarView
              pluginId={leftSidebarView?.activeView.pluginId ?? 'unknown-plugin'}
              slot={leftSidebarView?.activeView.slot ?? 'sidebar:left'}
              viewId={leftSidebarView?.activeView.id ?? 'unknown-view'}
              registration={leftRegistration}
              plugins={plugins}
              workspace={workspace}
              resolveRendererView={resolveRendererView}
            />
            <div
              className="sidebar-resize-handle sidebar-resize-handle--right"
              onMouseDown={e => startSidebarResize('left', leftWidth, setLeftWidth, e)}
            />
          </aside>
        ) : null}

        <section className="workspace-content">{mainContent}</section>

        {showRightSidebar ? (
          <aside className="sidebar sidebar--right">
            <div
              className="sidebar-resize-handle sidebar-resize-handle--left"
              onMouseDown={e => startSidebarResize('right', rightWidth, setRightWidth, e)}
            />
            <SidebarView
              pluginId={rightSidebarView?.activeView.pluginId ?? 'unknown-plugin'}
              slot={rightSidebarView?.activeView.slot ?? 'sidebar:right'}
              viewId={rightSidebarView?.activeView.id ?? 'unknown-view'}
              registration={rightRegistration}
              plugins={plugins}
              workspace={workspace}
              resolveRendererView={resolveRendererView}
            />
          </aside>
        ) : null}
      </main>

      {statusBarVisible && (
        <footer className="status-bar">
          {plugins.statusItems.map(item => (
            <div key={item.id} className="item">
              <span>{item.label}</span>
              <span>{resolveStatusValue(item, session)}</span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
};
