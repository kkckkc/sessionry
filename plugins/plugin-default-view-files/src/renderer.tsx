import React, { useCallback, useEffect, useState } from 'react';
import { TbChevronDown, TbChevronRight, TbFile } from 'react-icons/tb';
import type { RendererAppPlugin, WorkspaceApi } from '@sessionry/plugin-api';
import './styles.css';
import { fileBrowserPlugin } from '.';

interface FileEntry {
  name: string;
  isDirectory: boolean;
}

interface FileBrowserViewProps {
  workspace: WorkspaceApi;
}

interface TreeNodeProps {
  name: string;
  isDirectory: boolean;
  fullPath: string;
  sessionRoot: string;
  depth: number;
  workspace: WorkspaceApi;
}

const getActiveSession = (workspace: WorkspaceApi) => {
  const snapshot = workspace.snapshot;
  return snapshot.activeSessionId
    ? snapshot.sessions.find(session => session.id === snapshot.activeSessionId)
    : snapshot.sessions[0];
};

const getActivePaneId = (workspace: WorkspaceApi, sessionId: string): string | undefined => {
  const snapshot = workspace.snapshot;
  const session = snapshot.sessions.find(value => value.id === sessionId);
  if (!session) return undefined;
  if (session.focusedPaneId) return session.focusedPaneId;

  const groupById = new Map(snapshot.paneGroups.map(paneGroup => [paneGroup.id, paneGroup]));
  const visitGroup = (paneGroupId: string): string | undefined => {
    const paneGroup = groupById.get(paneGroupId);
    if (!paneGroup) return undefined;

    const children =
      paneGroup.direction === 'stacked'
        ? paneGroup.children
            .filter(child => {
              const childId = child.kind === 'pane' ? child.paneId : child.paneGroupId;
              return childId === paneGroup.activeChildId;
            })
            .slice(0, 1)
        : paneGroup.children;

    for (const child of children) {
      if (child.kind === 'pane') return child.paneId;

      const paneId = visitGroup(child.paneGroupId);
      if (paneId) return paneId;
    }

    return undefined;
  };

  return visitGroup(session.rootPaneGroupId);
};

const getPaneParentGroup = (workspace: WorkspaceApi, paneId: string) =>
  workspace.snapshot.paneGroups.find(paneGroup =>
    paneGroup.children.some(child => child.kind === 'pane' && child.paneId === paneId)
  );

const getFileTitle = (filePath: string) =>
  filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;

const openFileInCodePane = async (workspace: WorkspaceApi, filePath: string): Promise<void> => {
  const session = getActiveSession(workspace);
  if (!session) return;

  const focusedPaneId = getActivePaneId(workspace, session.id);
  if (!focusedPaneId) return;

  const focusedPane = workspace.getPane(focusedPaneId);
  if (!focusedPane) return;

  const parentPaneGroup = getPaneParentGroup(workspace, focusedPaneId);
  if (!parentPaneGroup) return;

  let targetPaneGroupId = parentPaneGroup.id;
  let insertIndex =
    parentPaneGroup.children.findIndex(
      child => child.kind === 'pane' && child.paneId === focusedPaneId
    ) + 1;

  if (parentPaneGroup.direction !== 'stacked') {
    const paneIndex = parentPaneGroup.children.findIndex(
      child => child.kind === 'pane' && child.paneId === focusedPaneId
    );
    if (paneIndex === -1) return;

    const stackedGroup = await focusedPane.session.createPaneGroup({
      name: `${focusedPane.data.state.title ?? getFileTitle(filePath)}`,
      direction: 'stacked',
      preferredSizePct: focusedPane.data.preferredSizePct,
      parentPaneGroupId: parentPaneGroup.id,
      index: paneIndex
    });
    await stackedGroup.moveNode({ kind: 'pane', paneId: focusedPaneId }, 0);
    targetPaneGroupId = stackedGroup.id;
    insertIndex = 1;
  }

  const targetPaneGroup = workspace.getPaneGroup(targetPaneGroupId);
  if (!targetPaneGroup) return;

  const existingCodePane = targetPaneGroup.data.children
    .filter((child): child is { kind: 'pane'; paneId: string } => child.kind === 'pane')
    .map(child => workspace.getPane(child.paneId)?.data)
    .find(pane => pane?.type === 'code' && pane.state.filePath === filePath);

  if (existingCodePane) {
    await targetPaneGroup.update({ activeChildId: existingCodePane.id });
    await focusedPane.session.setFocusedPane(existingCodePane.id);
    return;
  }

  const codePane = await focusedPane.session.createPane({
    type: 'code',
    state: {
      title: getFileTitle(filePath),
      filePath
    },
    parentPaneGroupId: targetPaneGroupId,
    index: insertIndex
  });
  await targetPaneGroup.update({ activeChildId: codePane.id });
  await focusedPane.session.setFocusedPane(codePane.id);
};

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  isDirectory,
  fullPath,
  sessionRoot,
  depth,
  workspace
}) => {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);

  const handleToggle = useCallback(async () => {
    if (!isDirectory) return;
    if (!open && children === null) {
      const entries = await window.terminalApp.readDirectory(fullPath);
      const sorted = [...entries].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setChildren(sorted);
    }
    setOpen(prev => !prev);
  }, [isDirectory, open, children, fullPath]);

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dragText = window.terminalApp.formatPathForTerminal(fullPath, sessionRoot);
      event.dataTransfer.setData('text/plain', dragText);
      event.dataTransfer.effectAllowed = 'copy';
    },
    [fullPath, sessionRoot]
  );

  const handleDoubleClick = useCallback(() => {
    if (isDirectory) return;
    void openFileInCodePane(workspace, fullPath);
  }, [fullPath, isDirectory, workspace]);

  const paddingLeft = 10 + depth * 14;

  return (
    <div className="file-tree-node">
      <div
        className="file-tree-row"
        style={{ paddingLeft }}
        draggable
        onClick={isDirectory ? handleToggle : undefined}
        onDoubleClick={handleDoubleClick}
        onDragStart={handleDragStart}
      >
        <span className="file-tree-chevron">
          {isDirectory ? open ? <TbChevronDown /> : <TbChevronRight /> : null}
        </span>
        {!isDirectory && (
          <span className="file-tree-icon file-tree-icon--file">
            <TbFile />
          </span>
        )}
        <span className={isDirectory ? 'file-tree-name file-tree-name--dir' : 'file-tree-name'}>
          {name}
        </span>
      </div>
      {isDirectory && open && children !== null && (
        <div className="file-tree-children">
          {children.map(child => (
            <TreeNode
              key={child.name}
              name={child.name}
              isDirectory={child.isDirectory}
              fullPath={`${fullPath}/${child.name}`}
              sessionRoot={sessionRoot}
              depth={depth + 1}
              workspace={workspace}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileBrowserView: React.FC<FileBrowserViewProps> = ({ workspace }) => {
  const [, setRefreshKey] = useState(0);
  const [rootEntries, setRootEntries] = useState<FileEntry[] | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  useEffect(() => {
    return workspace.subscribeAll(() => setRefreshKey(k => k + 1));
  }, [workspace]);

  const snapshot = workspace.snapshot;
  const activeSession = snapshot.activeSessionId
    ? snapshot.sessions.find(s => s.id === snapshot.activeSessionId)
    : snapshot.sessions[0];
  const folder = activeSession?.folder ?? null;

  useEffect(() => {
    if (folder === currentFolder) return;
    setCurrentFolder(folder);
    setRootEntries(null);
    if (!folder) return;
    window.terminalApp.readDirectory(folder).then(entries => {
      const sorted = [...entries].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setRootEntries(sorted);
    });
  }, [folder, currentFolder]);

  if (!folder || rootEntries === null) {
    return (
      <div className="file-browser">
        <div className="file-browser-empty">{!folder ? 'No active session' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="file-browser">
      {rootEntries.map(entry => (
        <TreeNode
          key={entry.name}
          name={entry.name}
          isDirectory={entry.isDirectory}
          fullPath={`${folder}/${entry.name}`}
          sessionRoot={folder}
          depth={0}
          workspace={workspace}
        />
      ))}
    </div>
  );
};

const fileBrowserView = fileBrowserPlugin.views?.[0];

if (!fileBrowserView) {
  throw new Error('fileBrowserPlugin must register a sidebar view.');
}

export const fileBrowserRendererPlugin: RendererAppPlugin = {
  id: fileBrowserPlugin.id,
  name: fileBrowserPlugin.name,
  views: [
    {
      ...fileBrowserView,
      component: FileBrowserView
    }
  ]
};

export default fileBrowserRendererPlugin;
