export interface VcsStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface VcsFileStatus {
  path: string;
  status: string;
  stagedStatus?: string;
  unstagedStatus?: string;
  oldPath?: string;
}

export interface VcsPullRequest {
  number: number;
  title: string;
  url?: string;
  headRefName?: string;
  state?: 'open' | 'draft' | 'merged' | 'closed';
  checks?: 'passing' | 'failing' | 'pending';
  reviewers?: number;
}

export interface VcsRepositoryInfo {
  branch?: string;
  pullRequest?: VcsPullRequest | null;
  ahead?: number;
  behind?: number;
  upstream?: string;
}

export interface VcsStatusResult {
  active: boolean;
  stats?: VcsStats | null;
  files?: VcsFileStatus[];
  repository?: VcsRepositoryInfo | null;
}

export interface ResolvedVcsStatus {
  providerId: string;
  providerName: string;
  stats: VcsStats | null;
  files: VcsFileStatus[];
  repository?: VcsRepositoryInfo | null;
}

export interface VcsProviderDefinition {
  id: string;
  name: string;
  priority?: number;
  getStatus: (folder: string) => Promise<VcsStatusResult> | VcsStatusResult;
  getDiff?: (folder: string, file: VcsFileStatus) => Promise<string | null> | string | null;
  stageFiles?: (folder: string, files: VcsFileStatus[]) => Promise<void> | void;
  commit?: (folder: string, message: string) => Promise<void> | void;
  push?: (folder: string) => Promise<void> | void;
  createPullRequest?: (folder: string) => Promise<void> | void;
  createBranch?: (folder: string, branchName: string) => Promise<void> | void;
}

export interface VcsRegistryApi {
  registerProvider: (provider: VcsProviderDefinition) => void;
}
