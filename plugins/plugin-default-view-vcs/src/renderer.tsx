import './styles.css';

import { useState, useEffect } from 'react';
import type {
  RendererAppPlugin,
  ResolvedVcsStatus,
  SidebarViewProps,
  VcsFileStatus,
  VcsRepositoryInfo
} from '@sessionry/plugin-api';

import { vcsViewPlugin } from '.';

const ACTIVE_SESSION_REFRESH_INTERVAL_MS = 60_000;

const getFileTitle = (filePath: string): string =>
  filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;

const getActivePaneId = (
  workspace: SidebarViewProps['workspace'],
  sessionId: string
): string | undefined => {
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

const getPaneParentGroup = (workspace: SidebarViewProps['workspace'], paneId: string) =>
  workspace.snapshot.paneGroups.find(paneGroup =>
    paneGroup.children.some(child => child.kind === 'pane' && child.paneId === paneId)
  );

const VcsRepositorySummary = ({ repository }: { repository?: VcsRepositoryInfo | null }) => {
  if (!repository?.branch && !repository?.pullRequest) {
    return null;
  }

  return (
    <dl className="vcs-repository">
      {repository.branch && (
        <div className="vcs-repository-row">
          <dt>Branch</dt>
          <dd title={repository.branch}>{repository.branch}</dd>
        </div>
      )}
      {repository.pullRequest && (
        <div className="vcs-repository-row">
          <dt>PR</dt>
          <dd title={repository.pullRequest.url ?? repository.pullRequest.title}>
            #{repository.pullRequest.number} {repository.pullRequest.title}
          </dd>
        </div>
      )}
    </dl>
  );
};

const VcsView = ({ workspace }: SidebarViewProps) => {
  const [status, setStatus] = useState<ResolvedVcsStatus | null>(null);
  const [files, setFiles] = useState<VcsFileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshKey] = useState(0);

  // Subscribe to workspace changes
  useEffect(() => workspace.subscribeAll(() => setRefreshKey(k => k + 1)), [workspace]);

  // Get active session folder
  const activeSession = workspace.snapshot.sessions.find(
    s => s.id === workspace.snapshot.activeSessionId
  );
  const activeSessionFolder = activeSession?.folder;

  // Load VCS file status
  useEffect(() => {
    let cancelled = false;

    const loadFileStatus = async (options: { showLoading: boolean }) => {
      if (!activeSessionFolder) {
        setStatus(null);
        setFiles([]);
        setLoading(false);
        return;
      }

      if (options.showLoading) {
        setLoading(true);
      }

      const status = await window.terminalApp.vcs.getStatus(activeSessionFolder);

      if (!cancelled) {
        setStatus(status);
        setFiles(status?.files ?? []);
        setLoading(false);
      }
    };

    void loadFileStatus({ showLoading: true });

    // Refresh repository metadata and file status while this session is active.
    const intervalId = setInterval(() => {
      void loadFileStatus({ showLoading: false });
    }, ACTIVE_SESSION_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeSessionFolder]);

  const openCodePane = async (state: Record<string, unknown>) => {
    if (!activeSession) return;

    const session = workspace.getSession(activeSession.id);
    if (!session) return;

    const focusedPaneId = getActivePaneId(workspace, activeSession.id);
    if (!focusedPaneId) {
      const pane = await session.createPane({
        type: 'code',
        state,
        parentPaneGroupId: session.data.rootPaneGroupId
      });
      await workspace
        .getPaneGroup(session.data.rootPaneGroupId)
        ?.update({ activeChildId: pane.id });
      await session.setFocusedPane(pane.id);
      return;
    }

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

      const stackedGroup = await session.createPaneGroup({
        name: `${focusedPane.data.state.title ?? getFileTitle(String(state.filePath ?? 'Code'))}`,
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

    const codePane = await session.createPane({
      type: 'code',
      state,
      parentPaneGroupId: targetPaneGroupId,
      index: insertIndex
    });
    await targetPaneGroup.update({ activeChildId: codePane.id });
    await session.setFocusedPane(codePane.id);
  };

  const handleFileDoubleClick = async (file: VcsFileStatus) => {
    if (!activeSession) return;

    const filePath = `${activeSession.folder}/${file.path}`;
    const diff = await window.terminalApp.vcs.getDiff(activeSession.folder, file);

    if (!diff) {
      await openCodePane({
        title: getFileTitle(filePath),
        filePath
      });
      return;
    }

    await openCodePane({
      title: `${getFileTitle(filePath)} · Read-only diff`,
      description: file.path,
      filePath,
      languagePath: filePath,
      content: diff,
      readOnly: true
    });
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      M: 'Modified',
      A: 'Added',
      D: 'Deleted',
      R: 'Renamed',
      C: 'Copied',
      U: 'Unmerged',
      '??': 'Untracked'
    };
    return statusMap[status] ?? status;
  };

  const getStatusClass = (status: string): string => {
    if (status.includes('M')) return 'status-modified';
    if (status.includes('A')) return 'status-added';
    if (status.includes('D')) return 'status-deleted';
    if (status.includes('R')) return 'status-renamed';
    if (status.includes('??')) return 'status-untracked';
    return 'status-unknown';
  };

  if (!activeSession) {
    return (
      <div className="vcs-view">
        <div className="vcs-empty">
          <p>No active session</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vcs-view">
        <div className="vcs-loading">
          <p>Loading changes...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="vcs-view">
        <div className="vcs-header">
          <span className="vcs-title">Changes</span>
          <span className="vcs-count">{files.length}</span>
        </div>
        <VcsRepositorySummary repository={status?.repository} />
        <div className="vcs-empty vcs-empty--inline">
          <p>No changes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vcs-view">
      <div className="vcs-header">
        <span className="vcs-title">Changes</span>
        <span className="vcs-count">{files.length}</span>
      </div>
      <VcsRepositorySummary repository={status?.repository} />
      <ul className="vcs-file-list">
        {files.map((file, index) => (
          <li key={index} className="vcs-file-item">
            <button
              type="button"
              className="vcs-file-button"
              onDoubleClick={() => {
                void handleFileDoubleClick(file);
              }}
              title={getStatusLabel(file.status)}
            >
              <span className={`vcs-status ${getStatusClass(file.status)}`}>{file.status}</span>
              <span className="vcs-file-path">
                {file.oldPath ? (
                  <>
                    <span className="vcs-old-path">{file.oldPath}</span>
                    <span className="vcs-arrow"> → </span>
                    <span>{file.path}</span>
                  </>
                ) : (
                  file.path
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const panelView = vcsViewPlugin.views?.[0];
if (!panelView) {
  throw new Error('vcsViewPlugin must register a sidebar view.');
}

export const vcsViewRendererPlugin: RendererAppPlugin = {
  id: vcsViewPlugin.id,
  name: vcsViewPlugin.name,
  views: [
    {
      ...panelView,
      component: VcsView
    }
  ]
};

export default vcsViewRendererPlugin;
