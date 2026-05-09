import type {
  ResolvedVcsStatus,
  VcsFileStatus,
  VcsProviderDefinition
} from '@sessionry/plugin-api';

interface CachedStatus {
  expiresAt: number;
  value: ResolvedVcsStatus | null;
}

interface RegisteredProvider extends VcsProviderDefinition {
  registrationOrder: number;
}

export interface VcsService {
  registerProvider: (provider: VcsProviderDefinition) => void;
  getStatus: (folder: string, options?: { bypassCache?: boolean }) => Promise<ResolvedVcsStatus | null>;
  getDiff: (folder: string, file: VcsFileStatus) => Promise<string | null>;
  stageFiles: (folder: string, files: VcsFileStatus[]) => Promise<void>;
  commit: (folder: string, message: string) => Promise<void>;
  push: (folder: string) => Promise<void>;
  createPullRequest: (folder: string) => Promise<void>;
  createBranch: (folder: string, branchName: string) => Promise<void>;
}

export interface CreateVcsServiceOptions {
  now?: () => number;
  ttlMs?: number;
}

export const createVcsService = (options: CreateVcsServiceOptions = {}): VcsService => {
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? 60_000;
  const providers: RegisteredProvider[] = [];
  const cache = new Map<string, CachedStatus>();

  const getSortedProviders = () =>
    [...providers].sort(
      (left, right) =>
        (right.priority ?? 0) - (left.priority ?? 0) ||
        left.registrationOrder - right.registrationOrder
    );

  const getActiveProvider = async (
    folder: string,
    supports: (provider: RegisteredProvider) => boolean
  ): Promise<RegisteredProvider | null> => {
    for (const provider of getSortedProviders()) {
      if (!supports(provider)) {
        continue;
      }

      try {
        const status = await provider.getStatus(folder);
        if (status.active) {
          return provider;
        }
      } catch {}
    }

    return null;
  };

  return {
    registerProvider: provider => {
      if (providers.some(registeredProvider => registeredProvider.id === provider.id)) {
        throw new Error(`VCS provider "${provider.id}" is already registered.`);
      }

      providers.push({
        ...provider,
        registrationOrder: providers.length
      });
      cache.clear();
    },
    getStatus: async (folder, options) => {
      const cached = cache.get(folder);
      const currentTime = now();
      if (!options?.bypassCache && cached && cached.expiresAt > currentTime) {
        return cached.value;
      }

      let resolvedStatus: ResolvedVcsStatus | null = null;
      for (const provider of getSortedProviders()) {
        try {
          const status = await provider.getStatus(folder);
          if (!status.active) {
            continue;
          }

          resolvedStatus = {
            providerId: provider.id,
            providerName: provider.name,
            stats: status.stats ?? null,
            files: status.files ?? [],
            ...(status.repository ? { repository: status.repository } : {})
          };
          break;
        } catch {}
      }

      cache.set(folder, {
        expiresAt: currentTime + ttlMs,
        value: resolvedStatus
      });

      return resolvedStatus;
    },
    getDiff: async (folder, file) => {
      const provider = await getActiveProvider(folder, provider => Boolean(provider.getDiff));
      if (provider?.getDiff) {
        try {
          return (await provider.getDiff(folder, file)) ?? null;
        } catch {}
      }

      return null;
    },
    stageFiles: async (folder, files) => {
      const provider = getSortedProviders().find(provider => Boolean(provider.stageFiles));
      if (!provider?.stageFiles) {
        throw new Error('No VCS provider supports staging files.');
      }

      await provider.stageFiles(folder, files);
      cache.delete(folder);
    },
    commit: async (folder, message) => {
      const provider = getSortedProviders().find(provider => Boolean(provider.commit));
      if (!provider?.commit) {
        throw new Error('No VCS provider supports committing files.');
      }

      await provider.commit(folder, message);
      cache.delete(folder);
    },
    push: async (folder) => {
      const provider = getSortedProviders().find(provider => Boolean(provider.push));
      if (!provider?.push) {
        throw new Error('No VCS provider supports pushing changes.');
      }

      await provider.push(folder);
      cache.delete(folder);
    },
    createPullRequest: async (folder) => {
      const provider = getSortedProviders().find(provider => Boolean(provider.createPullRequest));
      if (!provider?.createPullRequest) {
        throw new Error('No VCS provider supports creating pull requests.');
      }

      await provider.createPullRequest(folder);
      cache.delete(folder);
    },
    createBranch: async (folder, branchName) => {
      const provider = getSortedProviders().find(provider => Boolean(provider.createBranch));
      if (!provider?.createBranch) {
        throw new Error('No VCS provider supports creating branches.');
      }

      await provider.createBranch(folder, branchName);
      cache.delete(folder);
    }
  };
};
