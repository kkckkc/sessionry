export interface VcsStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface VcsFileStatus {
  path: string;
  status: string;
  oldPath?: string;
}

export interface VcsPullRequest {
  number: number;
  title: string;
  url?: string;
  headRefName?: string;
}

export interface VcsRepositoryInfo {
  branch?: string;
  pullRequest?: VcsPullRequest | null;
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
}

export interface VcsRegistryApi {
  registerProvider: (provider: VcsProviderDefinition) => void;
}
