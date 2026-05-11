import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteSnapshot } from './snapshotUtils';
import {
  createSnapshot,
  formatRelativeTime,
  getSnapshotFilename,
  getSnapshotsToDelete,
  parseSnapshotFilename
} from './snapshotUtils';

const SNAPSHOT_DELAY = 1 * 60 * 1000; // 1 minute
const HISTORY_DIR = '.sessionry/notes-history';

interface UseSnapshotManagerOptions {
  sessionFolder: string | null;
  content: string;
  onRestore: (content: string) => void;
}

export function useSnapshotManager({ sessionFolder, content, onRestore }: UseSnapshotManagerOptions) {
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const snapshotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotContentRef = useRef<string>('');

  // Get history directory path
  const getHistoryDir = useCallback(() => {
    if (!sessionFolder) return null;
    return `${sessionFolder}/${HISTORY_DIR}`;
  }, [sessionFolder]);

  // Load all snapshots
  const loadSnapshots = useCallback(async () => {
    const historyDir = getHistoryDir();
    if (!historyDir) {
      setSnapshots([]);
      return;
    }

    setIsLoadingSnapshots(true);
    try {
      // Ensure directory exists before reading
      await window.terminalApp.createDirectory(historyDir);
      
      const files = await window.terminalApp.readDirectory(historyDir);
      const snapshotFiles = files
        .filter(f => !f.isDirectory && f.name.endsWith('.json'))
        .map(f => f.name);

      const loadedSnapshots: NoteSnapshot[] = [];
      for (const filename of snapshotFiles) {
        const timestamp = parseSnapshotFilename(filename);
        if (timestamp === null) continue;

        try {
          const filePath = `${historyDir}/${filename}`;
          const fileContent = await window.terminalApp.readFile(filePath);
          const snapshot: NoteSnapshot = JSON.parse(fileContent);
          loadedSnapshots.push(snapshot);
        } catch (err) {
          console.error(`[Snapshots] Failed to load ${filename}:`, err);
        }
      }

      // Sort by timestamp descending (newest first)
      loadedSnapshots.sort((a, b) => b.timestamp - a.timestamp);
      setSnapshots(loadedSnapshots);
    } catch (err) {
      // Directory doesn't exist yet - this is normal on first run
      console.log('[Snapshots] History directory does not exist yet, will be created on first snapshot');
      setSnapshots([]);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [getHistoryDir]);

  // Save a snapshot
  const saveSnapshot = useCallback(
    async (snapshot: NoteSnapshot) => {
      const historyDir = getHistoryDir();
      if (!historyDir) return;

      try {
        // Ensure directory exists
        await window.terminalApp.createDirectory(historyDir);

        const filename = getSnapshotFilename(snapshot.timestamp);
        const filePath = `${historyDir}/${filename}`;
        await window.terminalApp.writeFile(filePath, JSON.stringify(snapshot, null, 2));
        console.log('[Snapshots] Saved snapshot:', filename);
      } catch (err) {
        console.error('[Snapshots] Failed to save snapshot:', err);
      }
    },
    [getHistoryDir]
  );

  // Clean up old snapshots based on retention policy
  const cleanupSnapshots = useCallback(async () => {
    const historyDir = getHistoryDir();
    if (!historyDir) return;

    try {
      const allTimestamps = snapshots.map(s => s.timestamp);
      const toDelete = getSnapshotsToDelete(allTimestamps);

      for (const timestamp of toDelete) {
        const filename = getSnapshotFilename(timestamp);
        const filePath = `${historyDir}/${filename}`;
        try {
          await window.terminalApp.deleteFile(filePath);
          console.log('[Snapshots] Deleted old snapshot:', filename);
        } catch (err) {
          console.error(`[Snapshots] Failed to delete ${filename}:`, err);
        }
      }

      // Reload snapshots after cleanup
      await loadSnapshots();
    } catch (err) {
      console.error('[Snapshots] Cleanup failed:', err);
    }
  }, [getHistoryDir, snapshots, loadSnapshots]);

  // Create a new snapshot
  const createNewSnapshot = useCallback(
    async (contentToSnapshot: string) => {
      if (!contentToSnapshot.trim()) return; // Don't snapshot empty content
      if (contentToSnapshot === lastSnapshotContentRef.current) return; // Don't snapshot if unchanged

      const snapshot = createSnapshot(contentToSnapshot);
      await saveSnapshot(snapshot);
      lastSnapshotContentRef.current = contentToSnapshot;

      // Reload and cleanup
      await loadSnapshots();
      await cleanupSnapshots();
    },
    [saveSnapshot, loadSnapshots, cleanupSnapshots]
  );

  // Schedule a snapshot after delay
  const scheduleSnapshot = useCallback(() => {
    if (snapshotTimeoutRef.current) {
      clearTimeout(snapshotTimeoutRef.current);
    }

    snapshotTimeoutRef.current = setTimeout(() => {
      void createNewSnapshot(content);
    }, SNAPSHOT_DELAY);
  }, [content, createNewSnapshot]);

  // Restore a snapshot (creates a snapshot of current content first)
  const restoreSnapshot = useCallback(
    async (snapshot: NoteSnapshot) => {
      try {
        // Create snapshot of current content before restoring
        if (content.trim()) {
          await createNewSnapshot(content);
        }

        // Restore the selected snapshot
        onRestore(snapshot.content);
        console.log('[Snapshots] Restored snapshot from:', formatRelativeTime(snapshot.timestamp));
      } catch (err) {
        console.error('[Snapshots] Restore failed:', err);
        throw err;
      }
    },
    [content, createNewSnapshot, onRestore]
  );

  // Load snapshots on mount and when session folder changes
  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  // Schedule snapshot when content changes
  useEffect(() => {
    if (content && sessionFolder) {
      scheduleSnapshot();
    }

    return () => {
      if (snapshotTimeoutRef.current) {
        clearTimeout(snapshotTimeoutRef.current);
      }
    };
  }, [content, sessionFolder, scheduleSnapshot]);

  return {
    snapshots,
    isLoadingSnapshots,
    restoreSnapshot,
    formatRelativeTime
  };
}
