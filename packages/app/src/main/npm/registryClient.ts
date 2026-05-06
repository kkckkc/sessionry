/**
 * NPM Registry Client
 *
 * Handles communication with the NPM registry API to search for plugins,
 * retrieve metadata, and get version information.
 */

import https from 'node:https';
import { URL } from 'node:url';

/**
 * NPM package metadata from registry
 */
export interface NpmPackageMetadata {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  author?: string | { name: string; email?: string };
  license?: string;
  homepage?: string;
  repository?: {
    type: string;
    url: string;
  };
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    electron?: string;
  };
}

/**
 * NPM package search result
 */
export interface NpmSearchResult {
  package: {
    name: string;
    version: string;
    description?: string;
    keywords?: string[];
    author?: { name: string; email?: string };
    publisher?: { username: string; email?: string };
    date: string;
    links?: {
      npm?: string;
      homepage?: string;
      repository?: string;
    };
  };
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
}

/**
 * NPM package versions response
 */
export interface NpmVersionsResponse {
  name: string;
  versions: Record<string, NpmPackageMetadata>;
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  time: Record<string, string>;
}

/**
 * Registry client configuration
 */
export interface RegistryClientConfig {
  registryUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  userAgent?: string;
}

/**
 * Registry client error
 */
export class RegistryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

/**
 * NPM Registry Client
 *
 * Provides methods to interact with the NPM registry API.
 */
export class NpmRegistryClient {
  private readonly registryUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly userAgent: string;

  constructor(config: RegistryClientConfig = {}) {
    this.registryUrl = config.registryUrl || 'https://registry.npmjs.org';
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
    this.userAgent = config.userAgent || 'Sessionry-Plugin-Manager/1.0';
  }

  /**
   * Search for plugins in the NPM registry
   *
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of search results
   */
  async searchPlugins(
    query: string,
    options: {
      size?: number;
      from?: number;
      quality?: number;
      popularity?: number;
      maintenance?: number;
    } = {}
  ): Promise<NpmSearchResult[]> {
    const { size = 20, from = 0, quality = 0.5, popularity = 0.3, maintenance = 0.2 } = options;

    // Build search URL with query parameters
    const searchUrl = new URL('/-/v1/search', this.registryUrl);
    searchUrl.searchParams.set('text', `${query} keywords:sessionry-plugin`);
    searchUrl.searchParams.set('size', size.toString());
    searchUrl.searchParams.set('from', from.toString());
    searchUrl.searchParams.set('quality', quality.toString());
    searchUrl.searchParams.set('popularity', popularity.toString());
    searchUrl.searchParams.set('maintenance', maintenance.toString());

    try {
      const response = await this.fetchWithRetry<{ objects: NpmSearchResult[] }>(
        searchUrl.toString()
      );

      return response.objects || [];
    } catch (error) {
      throw new RegistryError(
        `Failed to search plugins: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get metadata for a specific plugin package
   *
   * @param packageName - NPM package name
   * @param version - Optional specific version (defaults to latest)
   * @returns Package metadata
   */
  async getPluginMetadata(packageName: string, version?: string): Promise<NpmPackageMetadata> {
    if (!packageName) {
      throw new RegistryError('Package name is required', 'INVALID_PACKAGE_NAME');
    }

    // Encode package name for URL (handles scoped packages like @org/package)
    const encodedName = packageName.replace('/', '%2F');
    const url = version
      ? `${this.registryUrl}/${encodedName}/${version}`
      : `${this.registryUrl}/${encodedName}/latest`;

    try {
      const metadata = await this.fetchWithRetry<NpmPackageMetadata>(url);
      return metadata;
    } catch (error) {
      if (error instanceof RegistryError && error.statusCode === 404) {
        throw new RegistryError(
          `Package not found: ${packageName}${version ? `@${version}` : ''}`,
          'PACKAGE_NOT_FOUND',
          404
        );
      }
      throw new RegistryError(
        `Failed to get plugin metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_FETCH_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get all available versions for a plugin package
   *
   * @param packageName - NPM package name
   * @returns Package versions information
   */
  async getPluginVersions(packageName: string): Promise<NpmVersionsResponse> {
    if (!packageName) {
      throw new RegistryError('Package name is required', 'INVALID_PACKAGE_NAME');
    }

    // Encode package name for URL
    const encodedName = packageName.replace('/', '%2F');
    const url = `${this.registryUrl}/${encodedName}`;

    try {
      const response = await this.fetchWithRetry<NpmVersionsResponse>(url);
      return response;
    } catch (error) {
      if (error instanceof RegistryError && error.statusCode === 404) {
        throw new RegistryError(`Package not found: ${packageName}`, 'PACKAGE_NOT_FOUND', 404);
      }
      throw new RegistryError(
        `Failed to get plugin versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERSIONS_FETCH_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetch data from URL with retry logic
   *
   * @param url - URL to fetch
   * @param attempt - Current attempt number (for internal use)
   * @returns Parsed JSON response
   */
  private async fetchWithRetry<T>(url: string, attempt = 1): Promise<T> {
    try {
      return await this.fetch<T>(url);
    } catch (error) {
      // Don't retry on 404 or client errors (4xx)
      if (
        error instanceof RegistryError &&
        error.statusCode &&
        error.statusCode >= 400 &&
        error.statusCode < 500
      ) {
        throw error;
      }

      // Retry on network errors or server errors (5xx)
      if (attempt < this.retries) {
        await this.delay(this.retryDelay * attempt);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Fetch data from URL using https module
   *
   * @param url - URL to fetch
   * @returns Parsed JSON response
   */
  private fetch<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        timeout: this.timeout
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data) as T;
              resolve(parsed);
            } catch (error) {
              reject(
                new RegistryError(
                  'Failed to parse JSON response',
                  'PARSE_ERROR',
                  res.statusCode,
                  error instanceof Error ? error : undefined
                )
              );
            }
          } else {
            reject(
              new RegistryError(
                `HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`,
                'HTTP_ERROR',
                res.statusCode
              )
            );
          }
        });
      });

      req.on('error', error => {
        reject(
          new RegistryError(`Network error: ${error.message}`, 'NETWORK_ERROR', undefined, error)
        );
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new RegistryError(`Request timeout after ${this.timeout}ms`, 'TIMEOUT'));
      });

      req.end();
    });
  }

  /**
   * Delay execution for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a default NPM registry client instance
 */
export function createRegistryClient(config?: RegistryClientConfig): NpmRegistryClient {
  return new NpmRegistryClient(config);
}
