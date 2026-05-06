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
  getStatus: (folder: string) => Promise<ResolvedVcsStatus | null>;
  getDiff: (folder: string, file: VcsFileStatus) => Promise<string | null>;
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
    getStatus: async folder => {
      const cached = cache.get(folder);
      const currentTime = now();
      if (cached && cached.expiresAt > currentTime) {
        return cached.value;
      }

      const sortedProviders = [...providers].sort(
        (left, right) =>
          (right.priority ?? 0) - (left.priority ?? 0) ||
          left.registrationOrder - right.registrationOrder
      );

      let resolvedStatus: ResolvedVcsStatus | null = null;
      for (const provider of sortedProviders) {
        try {
          const status = await provider.getStatus(folder);
          if (!status.active) {
            continue;
          }

          resolvedStatus = {
            providerId: provider.id,
            providerName: provider.name,
            stats: status.stats ?? null,
            files: status.files ?? []
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
      const sortedProviders = [...providers].sort(
        (left, right) =>
          (right.priority ?? 0) - (left.priority ?? 0) ||
          left.registrationOrder - right.registrationOrder
      );

      for (const provider of sortedProviders) {
        if (!provider.getDiff) {
          continue;
        }

        try {
          const status = await provider.getStatus(folder);
          if (!status.active) {
            continue;
          }

          return (await provider.getDiff(folder, file)) ?? null;
        } catch {}
      }

      return null;
    }
  };
};
