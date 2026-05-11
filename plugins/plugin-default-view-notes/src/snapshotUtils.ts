export interface NoteSnapshot {
  timestamp: number;
  content: string;
  wordCount: number;
  charCount: number;
  preview: string;
}

interface RetentionBucket {
  maxAge: number;
  interval: number;
}

const RETENTION_BUCKETS: RetentionBucket[] = [
  { maxAge: 1 * 60 * 60 * 1000, interval: 5 * 60 * 1000 }, // 0-1h: every 5m
  { maxAge: 6 * 60 * 60 * 1000, interval: 15 * 60 * 1000 }, // 1-6h: every 15m
  { maxAge: 24 * 60 * 60 * 1000, interval: 60 * 60 * 1000 }, // 6-24h: every 1h
  { maxAge: 7 * 24 * 60 * 60 * 1000, interval: 6 * 60 * 60 * 1000 }, // 1-7d: every 6h
  { maxAge: 30 * 24 * 60 * 60 * 1000, interval: 24 * 60 * 60 * 1000 }, // 7-30d: every 1d
  { maxAge: Number.POSITIVE_INFINITY, interval: 7 * 24 * 60 * 60 * 1000 } // 30d+: every 1w
];

export function createSnapshot(content: string): NoteSnapshot {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const preview = content.slice(0, 100).replace(/\n/g, ' ');

  return {
    timestamp: Date.now(),
    content,
    wordCount,
    charCount,
    preview
  };
}

export function shouldKeepSnapshot(
  timestamp: number,
  now: number,
  allTimestamps: number[]
): boolean {
  const age = now - timestamp;

  // Find appropriate bucket
  const bucket = RETENTION_BUCKETS.find(b => age <= b.maxAge);
  if (!bucket) return false;

  // Find all snapshots in the same interval
  const intervalStart = Math.floor(timestamp / bucket.interval) * bucket.interval;
  const snapshotsInInterval = allTimestamps.filter(
    t => Math.floor(t / bucket.interval) === Math.floor(timestamp / bucket.interval)
  );

  // Keep the snapshot closest to the interval start
  const closestInInterval = snapshotsInInterval.reduce((closest, t) =>
    Math.abs(t - intervalStart) < Math.abs(closest - intervalStart) ? t : closest
  );

  return timestamp === closestInInterval;
}

export function getSnapshotsToDelete(allTimestamps: number[]): number[] {
  const now = Date.now();
  const toDelete: number[] = [];

  for (const timestamp of allTimestamps) {
    if (!shouldKeepSnapshot(timestamp, now, allTimestamps)) {
      toDelete.push(timestamp);
    }
  }

  return toDelete;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  if (days < 365)
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`;
}

export function getSnapshotFilename(timestamp: number): string {
  return `${timestamp}.json`;
}

export function parseSnapshotFilename(filename: string): number | null {
  const match = filename.match(/^(\d+)\.json$/);
  return match ? Number.parseInt(match[1], 10) : null;
}
