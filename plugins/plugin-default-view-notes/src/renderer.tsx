import { useEffect, useState, useCallback, useRef } from 'react';
import { TbTrash, TbHistory } from 'react-icons/tb';
import type { RendererAppPlugin, SidebarViewProps } from '@sessionry/plugin-api';
import { Menu, Section } from '@sessionry/components';

import { notesViewPlugin } from '.';
import { useSnapshotManager } from './useSnapshotManager';
import './styles.css';

const NOTES_FILE = '.sessionry/notes.md';
const AUTO_SAVE_DELAY = 1000; // 1 second debounce

export const NotesView = ({ workspace }: SidebarViewProps) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Calculate word and character counts
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  
  // Get active session folder
  const getSessionFolder = useCallback(() => {
    const activeSessionId = workspace.snapshot.activeSessionId;
    if (!activeSessionId) return null;
    
    const session = workspace.snapshot.sessions.find(s => s.id === activeSessionId);
    return session?.folder ?? null;
  }, [workspace]);

  const sessionFolderRef = useRef(getSessionFolder());

  // Update session folder ref when workspace changes
  useEffect(() => {
    sessionFolderRef.current = getSessionFolder();
  }, [getSessionFolder]);

  // Load notes from file
  const loadNotes = useCallback(async () => {
    if (!sessionFolderRef.current) {
      setContent('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const notesPath = `${sessionFolderRef.current}/${NOTES_FILE}`;
      const fileContent = await window.terminalApp.readFile(notesPath);
      setContent(fileContent);
    } catch (err) {
      // File doesn't exist yet, start with empty content
      setContent('');
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save notes to file
  const saveNotes = useCallback(async (text: string) => {
    if (!sessionFolderRef.current) return;

    try {
      setIsSaving(true);
      setError(null);
      const notesPath = `${sessionFolderRef.current}/${NOTES_FILE}`;
      await window.terminalApp.writeFile(notesPath, text);
    } catch (err) {
      setError('Failed to save notes');
      console.error('[Notes] Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Load notes on mount and when session folder changes
  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  // Handle content changes with auto-save debouncing
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        void saveNotes(newContent);
      }, AUTO_SAVE_DELAY);
    },
    [saveNotes]
  );

  // Handle clearing notes
  const handleClearNotes = useCallback(() => {
    setContent('');
    void saveNotes('');
  }, [saveNotes]);

  // Handle restore from snapshot
  const handleRestore = useCallback(
    (restoredContent: string) => {
      setContent(restoredContent);
      void saveNotes(restoredContent);
    },
    [saveNotes]
  );

  const sessionFolder = getSessionFolder();

  // Snapshot manager
  const { snapshots, isLoadingSnapshots, restoreSnapshot, formatRelativeTime } = useSnapshotManager({
    sessionFolder,
    content,
    onRestore: handleRestore
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!sessionFolder) {
    return (
      <div className="notes-view">
        <Section title="Notes">
          <div className="notes-empty">
            <p>No workspace folder selected</p>
            <p className="notes-hint">Open a folder to start taking notes</p>
          </div>
        </Section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="notes-view">
        <Section title="Notes">
          <div className="notes-loading">Loading notes...</div>
        </Section>
      </div>
    );
  }

  return (
    <div className="notes-view">
      <div className="notes-toolbar">
        <div className="notes-toolbar-left">
          <div className="notes-history-dropdown">
            <Menu.Root open={showHistoryMenu} onOpenChange={open => setShowHistoryMenu(open)}>
              <Menu.Trigger
                className="notes-history-button"
                title="View history"
                disabled={isLoadingSnapshots || snapshots.length === 0}
              >
                <TbHistory />
                <span>History</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup className="notes-history-menu">
                    <div className="notes-history-header">History</div>
                    <div className="notes-history-list">
                      {snapshots.map(snapshot => (
                        <Menu.Item
                          key={snapshot.timestamp}
                          className="notes-history-item"
                          onClick={() => {
                            void restoreSnapshot(snapshot);
                            setShowHistoryMenu(false);
                          }}
                        >
                          <div className="notes-history-item-content">
                            <div className="notes-history-time">
                              {formatRelativeTime(snapshot.timestamp)}
                            </div>
                            <div className="notes-history-preview">{snapshot.preview}</div>
                            <div className="notes-history-meta">
                              {snapshot.wordCount} words, {snapshot.charCount} chars
                            </div>
                          </div>
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
          <button
            className="notes-clear-button"
            onClick={handleClearNotes}
            title="Clear notes"
            disabled={!content}
          >
            <TbTrash />
          </button>
        </div>
        <div className="notes-status">
          {isSaving && <span className="notes-saving">Saving...</span>}
          {error && <span className="notes-error">{error}</span>}
          {!isSaving && !error && content && (
            <span className="notes-saved">
              <span className="notes-saved-bullet">●</span> Saved
            </span>
          )}
        </div>
      </div>
      <textarea
        className="notes-editor"
        value={content}
        onChange={e => handleContentChange(e.target.value)}
        placeholder="Start typing your notes here..."
        spellCheck={true}
      />
      <div className="notes-footer">
        <span className="notes-stats">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}, {charCount} {charCount === 1 ? 'character' : 'characters'}
        </span>
      </div>
    </div>
  );
};

const panelView = notesViewPlugin.views?.[0];
if (!panelView) {
  throw new Error('notesViewPlugin must register a sidebar view.');
}

export const notesViewRendererPlugin: RendererAppPlugin = {
  id: notesViewPlugin.id,
  name: notesViewPlugin.name,
  views: [
    {
      ...panelView,
      component: NotesView
    }
  ]
};

export default notesViewRendererPlugin;
