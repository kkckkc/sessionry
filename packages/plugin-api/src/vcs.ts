export interface VcsStats {
  filesChanged: number
  insertions: number
  deletions: number
}

export interface VcsStatusResult {
  active: boolean
  stats?: VcsStats | null
}

export interface ResolvedVcsStatus {
  providerId: string
  providerName: string
  stats: VcsStats | null
}

export interface VcsProviderDefinition {
  id: string
  name: string
  priority?: number
  getStatus: (folder: string) => Promise<VcsStatusResult> | VcsStatusResult
}

export interface VcsRegistryApi {
  registerProvider: (provider: VcsProviderDefinition) => void
}
