import './styles.css';

import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { TbRefresh } from 'react-icons/tb';
import type {
  RendererAppPlugin,
  ResolvedVcsStatus,
  SidebarViewProps,
  VcsFileStatus,
  VcsRepositoryInfo
} from '@sessionry/plugin-api';
import { Dialog, DialogHeader, DialogContent, DialogFooter, Button, Input, SplitButton } from '@sessionry/components';

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

const PR_STATE_CLASS: Record<string, string> = {
  open: 'vcs-pr-badge--open',
  draft: 'vcs-pr-badge--draft',
  merged: 'vcs-pr-badge--merged',
  closed: 'vcs-pr-badge--closed'
};

const PR_STATE_LABEL: Record<string, string> = {
  open: 'Open',
  draft: 'Draft',
  merged: 'Merged',
  closed: 'Closed'
};

const CHECK_DOT_CLASS: Record<string, string> = {
  passing: 'vcs-check-dot--passing',
  failing: 'vcs-check-dot--failing',
  pending: 'vcs-check-dot--pending'
};

const VcsRepositorySummary = ({
  repository,
  onRefresh,
  onCreateBranch,
  onPush,
  onCreatePullRequest,
  onSwitchBranch,
  isMutating,
  activeSessionFolder
}: {
  repository?: VcsRepositoryInfo | null;
  onRefresh?: () => void;
  onCreateBranch?: () => void;
  onPush?: () => void;
  onCreatePullRequest?: () => void;
  onSwitchBranch?: (branchName: string) => void;
  isMutating?: boolean;
  activeSessionFolder?: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [branchMenuPosition, setBranchMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const branchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!branchMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [branchMenuOpen]);

  const handleBranchMenuToggle = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    
    if (!branchMenuOpen) {
      // Calculate position for fixed menu
      if (branchButtonRef.current) {
        const rect = branchButtonRef.current.getBoundingClientRect();
        setBranchMenuPosition({
          top: rect.bottom + 4,
          left: rect.left
        });
      }
      
      if (activeSessionFolder) {
        setLoadingBranches(true);
        try {
          const branchList = await window.terminalApp.vcs.listBranches(activeSessionFolder);
          setBranches(branchList);
        } catch (error) {
          console.error('Failed to load branches:', error);
          setBranches([]);
        } finally {
          setLoadingBranches(false);
        }
      }
    } else {
      setBranchMenuPosition(null);
    }
    
    setBranchMenuOpen(o => !o);
  };

  const handleBranchSwitch = async (branchName: string) => {
    setBranchMenuOpen(false);
    onSwitchBranch?.(branchName);
  };

  if (!repository?.branch && !repository?.pullRequest) {
    return null;
  }

  const pr = repository.pullRequest;
  const hasSyncInfo =
    repository.ahead !== undefined || repository.behind !== undefined || repository.upstream;

  return (
    <div className="vcs-repository">
      {repository.branch && (
        <div className="vcs-branch-row">
          <svg className="vcs-branch-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="11" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M5 5.5v2C5 9.43 6.57 11 8.5 11H9.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
          <div className="vcs-branch-name-container">
            <span className="vcs-branch-name" title={repository.branch}>
              {repository.branch}
            </span>
            {onSwitchBranch && (
              <div className="vcs-branch-menu-container vcs-branch-switch-container" ref={branchMenuRef}>
                <button
                  ref={branchButtonRef}
                  type="button"
                  className="vcs-branch-switch-btn"
                  onClick={handleBranchMenuToggle}
                  disabled={isMutating || loadingBranches}
                  title="Switch branch"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                    <path d="M4 6l4 4 4-4z" />
                  </svg>
                </button>
                {branchMenuOpen && branchMenuPosition && (
                  <div 
                    className="vcs-branch-menu vcs-branch-switch-menu"
                    style={{
                      top: `${branchMenuPosition.top}px`,
                      left: `${branchMenuPosition.left}px`
                    }}
                  >
                    {loadingBranches ? (
                      <div className="vcs-branch-menu-loading">Loading branches...</div>
                    ) : branches.length > 0 ? (
                      branches.map(branch => (
                        <button
                          key={branch}
                          type="button"
                          className={`vcs-branch-menu-item${branch === repository.branch ? ' vcs-branch-menu-item--active' : ''}`}
                          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleBranchSwitch(branch);
                          }}
                          disabled={isMutating || branch === repository.branch}
                        >
                          {branch}
                        </button>
                      ))
                    ) : (
                      <div className="vcs-branch-menu-empty">No branches found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {(onRefresh || onCreateBranch) && (
            <div className="vcs-branch-menu-container" ref={menuRef}>
              {onRefresh && (
                <button
                  type="button"
                  className="vcs-branch-refresh-btn"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={isMutating}
                  title="Refresh"
                >
                  <TbRefresh size={14} />
                </button>
              )}
              <button
                ref={menuButtonRef}
                type="button"
                className="vcs-branch-menu-btn"
                onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (!menuOpen && menuButtonRef.current) {
                    const rect = menuButtonRef.current.getBoundingClientRect();
                    setMenuPosition({
                      top: rect.bottom + 4,
                      right: window.innerWidth - rect.right
                    });
                  } else {
                    setMenuPosition(null);
                  }
                  setMenuOpen(o => !o);
                }}
                title="More options"
              >
                <svg viewBox="0 0 16 4" fill="currentColor" width="10" height="3">
                  <circle cx="2" cy="2" r="1.5" />
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="14" cy="2" r="1.5" />
                </svg>
              </button>
              {menuOpen && menuPosition && (
                <div 
                  className="vcs-branch-menu"
                  style={{
                    top: `${menuPosition.top}px`,
                    right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
                    left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined
                  }}
                >
                  {onPush && (
                    <button
                      type="button"
                      className="vcs-branch-menu-item"
                      onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onPush();
                      }}
                      disabled={isMutating || (!!repository?.upstream && !repository?.ahead)}
                    >
                      Push
                    </button>
                  )}
                  {onCreatePullRequest && !repository?.pullRequest && (
                    <button
                      type="button"
                      className="vcs-branch-menu-item"
                      onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onCreatePullRequest();
                      }}
                      disabled={isMutating}
                    >
                      Create PR
                    </button>
                  )}
                  {onCreateBranch && (
                    <button
                      type="button"
                      className="vcs-branch-menu-item"
                      onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onCreateBranch();
                      }}
                      disabled={isMutating}
                    >
                      Create Branch...
                    </button>
                  )}
                  <button
                    type="button"
                    className="vcs-branch-menu-item"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onRefresh?.();
                    }}
                    disabled={isMutating}
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasSyncInfo && (
        <div className="vcs-sync-status">
          {repository.ahead !== undefined && (
            <span className="vcs-sync-item">
              <span className="vcs-sync-arrow--ahead">↑</span>
              {repository.ahead}
            </span>
          )}
          {repository.behind !== undefined && (
            <span className="vcs-sync-item">
              <span className="vcs-sync-arrow--behind">↓</span>
              {repository.behind}
            </span>
          )}
          {repository.upstream && (
            <span className="vcs-upstream" title={repository.upstream}>
              {repository.upstream}
            </span>
          )}
        </div>
      )}

      {pr && (
        <>
          <div className="vcs-divider" />
          <div
            className={`vcs-pr-section${pr.url ? ' vcs-pr-section--link' : ''}`}
            onClick={
              pr.url
                ? () => {
                    void window.terminalApp.openExternal(pr.url!);
                  }
                : undefined
            }
          >
            <div className="vcs-pr-header">
              <span className="vcs-pr-label">Pull Request</span>
              {pr.state && (
                <span className={`vcs-pr-badge ${PR_STATE_CLASS[pr.state] ?? ''}`}>
                  {PR_STATE_LABEL[pr.state] ?? pr.state}
                </span>
              )}
              <span className="vcs-pr-spacer" />
              <span className="vcs-pr-number">#{pr.number}</span>
            </div>
            <div className="vcs-pr-title" title={pr.title}>
              {pr.title}
            </div>
            {(pr.checks ?? pr.reviewers !== undefined) && (
              <div className="vcs-pr-meta">
                {pr.checks && (
                  <span className="vcs-pr-checks">
                    <span className={`vcs-check-dot ${CHECK_DOT_CLASS[pr.checks] ?? ''}`} />
                    checks {pr.checks}
                  </span>
                )}
                {pr.reviewers !== undefined && <span>{pr.reviewers} reviewers</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const VcsView = ({ workspace }: SidebarViewProps) => {
  const [status, setStatus] = useState<ResolvedVcsStatus | null>(null);
  const [files, setFiles] = useState<VcsFileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshKey] = useState(0);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [commitMessage, setCommitMessage] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showCreateBranchDialog, setShowCreateBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Subscribe to workspace changes
  useEffect(() => workspace.subscribeAll(() => setRefreshKey(k => k + 1)), [workspace]);

  // Get active session folder
  const activeSession = workspace.snapshot.sessions.find(
    s => s.id === workspace.snapshot.activeSessionId
  );
  const activeSessionFolder = activeSession?.folder;
  const refreshVcsStatus = () => setManualRefreshKey(k => k + 1);

  // Load VCS file status
  useEffect(() => {
    let cancelled = false;

    const loadFileStatus = async (options: { showLoading: boolean; bypassCache?: boolean }) => {
      if (!activeSessionFolder) {
        setStatus(null);
        setFiles([]);
        setLoading(false);
        return;
      }

      if (options.showLoading) {
        setLoading(true);
      }

      const status = await window.terminalApp.vcs.getStatus(activeSessionFolder, {
        bypassCache: options.bypassCache
      });

      if (!cancelled) {
        setStatus(status);
        setFiles(status?.files ?? []);
        setLoading(false);
      }
    };

    void loadFileStatus({ showLoading: manualRefreshKey === 0, bypassCache: manualRefreshKey > 0 });

    // Refresh repository metadata and file status while this session is active.
    const intervalId = setInterval(() => {
      void loadFileStatus({ showLoading: false });
    }, ACTIVE_SESSION_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeSessionFolder, manualRefreshKey]);

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

  const isStagedFile = (file: VcsFileStatus): boolean => Boolean(file.stagedStatus);
  const isUnstagedFile = (file: VcsFileStatus): boolean =>
    Boolean(file.unstagedStatus) || (!file.stagedStatus && file.status.length > 0);

  const stagedFiles = files.filter(isStagedFile);
  const unstagedFiles = files.filter(isUnstagedFile);
  const canCommit = stagedFiles.length > 0 && commitMessage.trim().length > 0 && !isMutating;

  const handleStageFiles = async (targetFiles: VcsFileStatus[]) => {
    if (!activeSessionFolder || targetFiles.length === 0) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.stageFiles(activeSessionFolder, targetFiles);
      refreshVcsStatus();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to stage files.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleCommit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!activeSessionFolder || !canCommit) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.commit(activeSessionFolder, commitMessage);
      setCommitMessage('');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to commit changes.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleCommitAndPush = async () => {
    if (!activeSessionFolder || !canCommit) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.commit(activeSessionFolder, commitMessage);
      await window.terminalApp.vcs.push(activeSessionFolder);
      setCommitMessage('');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to commit and push changes.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleCreatePR = async () => {
    if (!activeSessionFolder || !canCommit) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.commit(activeSessionFolder, commitMessage);
      await window.terminalApp.vcs.push(activeSessionFolder);
      await window.terminalApp.vcs.createPullRequest(activeSessionFolder);
      setCommitMessage('');
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to create pull request.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleCreateBranch = () => {
    if (!activeSessionFolder || isMutating) return;
    setNewBranchName('');
    setShowCreateBranchDialog(true);
  };

  const handlePush = async () => {
    if (!activeSessionFolder || isMutating) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.push(activeSessionFolder);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to push changes.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleCreatePullRequest = async () => {
    if (!activeSessionFolder || isMutating) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.createPullRequest(activeSessionFolder);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to create pull request.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (!activeSessionFolder || isMutating) return;

    setMutationError(null);
    setIsMutating(true);
    try {
      await window.terminalApp.vcs.switchBranch(activeSessionFolder, branchName);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to switch branch.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const handleConfirmCreateBranch = async () => {
    if (!activeSessionFolder || isMutating || !newBranchName.trim()) return;

    setMutationError(null);
    setIsMutating(true);
    setShowCreateBranchDialog(false);
    try {
      await window.terminalApp.vcs.createBranch(activeSessionFolder, newBranchName.trim());
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to create branch.');
    } finally {
      setIsMutating(false);
      refreshVcsStatus();
    }
  };

  const renderFileList = (
    sectionFiles: VcsFileStatus[],
    options: { kind: 'staged' | 'unstaged'; canStage?: boolean }
  ) => (
    <ul className="vcs-file-list">
      {sectionFiles.map((file, index) => {
        const displayStatus =
          options.kind === 'staged'
            ? file.stagedStatus ?? file.status
            : file.unstagedStatus ?? file.status;

        return (
          <li
            key={`${options.kind}:${file.oldPath ?? ''}:${file.path}:${index}`}
            className="vcs-file-item"
          >
            <button
              type="button"
              className="vcs-file-button"
              onDoubleClick={() => {
                void handleFileDoubleClick(file);
              }}
              title={getStatusLabel(displayStatus)}
            >
              <span className={`vcs-status ${getStatusClass(displayStatus)}`}>
                {displayStatus}
              </span>
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
            {options.canStage && (
              <button
                type="button"
                className="vcs-file-action"
                onClick={() => {
                  void handleStageFiles([file]);
                }}
                disabled={isMutating}
                title="Stage file"
                aria-label={`Stage ${file.path}`}
              >
                +
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  const commitForm = (
    <form className="vcs-commit" onSubmit={event => void handleCommit(event)}>
      <textarea
        className="vcs-commit-message"
        value={commitMessage}
        onChange={event => setCommitMessage(event.target.value)}
        placeholder="Commit message"
        rows={3}
      />
      {mutationError && <div className="vcs-error">{mutationError}</div>}
      <SplitButton
        variant="primary"
        type="submit"
        disabled={!canCommit}
        onClick={() => void handleCommit()}
        options={[
          {
            label: 'Commit',
            onClick: () => void handleCommit(),
            disabled: !canCommit
          },
          {
            label: 'Commit & Push',
            onClick: () => void handleCommitAndPush(),
            disabled: !canCommit
          },
          {
            label: 'Create PR',
            onClick: () => void handleCreatePR(),
            disabled: !canCommit
          }
        ]}
        className="vcs-commit-button"
      >
        {isMutating ? 'Working...' : stagedFiles.length > 0 ? `Commit (${stagedFiles.length})` : 'Commit'}
      </SplitButton>
    </form>
  );

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
        <VcsRepositorySummary
          repository={status?.repository}
          onRefresh={refreshVcsStatus}
          onCreateBranch={handleCreateBranch}
          onPush={handlePush}
          onCreatePullRequest={handleCreatePullRequest}
          onSwitchBranch={handleSwitchBranch}
          isMutating={isMutating}
          activeSessionFolder={activeSessionFolder}
        />
        <div className="vcs-changes-scroll">
          <div className="vcs-empty vcs-empty--inline">
            <p>No changes</p>
          </div>
        </div>
        {commitForm}
        <Dialog open={showCreateBranchDialog} onOpenChange={setShowCreateBranchDialog}>
          <DialogHeader title="Create New Branch" />
          <DialogContent>
            <Input
              value={newBranchName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewBranchName(e.target.value)}
              placeholder="Branch name"
              autoFocus
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && newBranchName.trim()) {
                  void handleConfirmCreateBranch();
                }
              }}
            />
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => setShowCreateBranchDialog(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmCreateBranch()}
              disabled={!newBranchName.trim() || isMutating}
              variant="primary"
            >
              Create
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="vcs-view">
      <VcsRepositorySummary
        repository={status?.repository}
        onRefresh={refreshVcsStatus}
        onCreateBranch={handleCreateBranch}
        onPush={handlePush}
        onCreatePullRequest={handleCreatePullRequest}
        onSwitchBranch={handleSwitchBranch}
        isMutating={isMutating}
        activeSessionFolder={activeSessionFolder}
      />
      <div className="vcs-changes-scroll">
        <section className="vcs-change-section">
          <div className="vcs-section-header">
            <span>Staged</span>
            <span className="vcs-section-count">{stagedFiles.length}</span>
          </div>
          {stagedFiles.length > 0 ? (
            renderFileList(stagedFiles, { kind: 'staged' })
          ) : (
            <p className="vcs-section-empty">No staged changes</p>
          )}
        </section>
        <section className="vcs-change-section">
          <div className="vcs-section-header vcs-section-header--with-action">
            <div className="vcs-section-title">
              <span>Unstaged</span>
              <span className="vcs-section-count">{unstagedFiles.length}</span>
            </div>
            <div className="vcs-section-action">
              {unstagedFiles.length > 0 && (
                <button
                  type="button"
                  className="vcs-stage-all-button"
                  onClick={() => {
                    void handleStageFiles(unstagedFiles);
                  }}
                  disabled={isMutating}
                >
                  Stage All
                </button>
              )}
            </div>
          </div>
          {unstagedFiles.length > 0 ? (
            renderFileList(unstagedFiles, { kind: 'unstaged', canStage: true })
          ) : (
            <p className="vcs-section-empty">No unstaged changes</p>
          )}
        </section>
      </div>
      {commitForm}
      <Dialog open={showCreateBranchDialog} onOpenChange={setShowCreateBranchDialog}>
        <DialogHeader title="Create New Branch" />
        <DialogContent>
          <Input
            value={newBranchName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewBranchName(e.target.value)}
            placeholder="Branch name"
            autoFocus
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && newBranchName.trim()) {
                void handleConfirmCreateBranch();
              }
            }}
          />
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setShowCreateBranchDialog(false)} variant="ghost">
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmCreateBranch()}
            disabled={!newBranchName.trim() || isMutating}
            variant="primary"
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>
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
