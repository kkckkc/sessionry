/**
 * Plugin Manager Service
 * 
 * Orchestrates plugin operations by coordinating the registry client,
 * validator, and installer components.
 */

import { EventEmitter } from 'events'
import {
  NpmRegistryClient,
  createRegistryClient,
  type NpmSearchResult,
  type NpmPackageMetadata,
  type RegistryClientConfig
} from './registryClient'
import {
  PluginValidator,
  createValidator,
  type PluginManifest,
  type ValidationResult,
  type ValidatorConfig
} from './pluginValidator'
import {
  PluginInstaller,
  createInstaller,
  type InstallResult,
  type ProgressCallback
} from './pluginInstaller'

/**
 * Plugin search options
 */
export interface SearchOptions {
  query: string
  size?: number
  from?: number
}

/**
 * Plugin search result with validation status
 */
export interface PluginSearchResult extends NpmSearchResult {
  compatible?: boolean
  validationWarnings?: string[]
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  force?: boolean
  skipValidation?: boolean
  onProgress?: ProgressCallback
}

/**
 * Plugin update information
 */
export interface PluginUpdateInfo {
  pluginId: string
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  changelog?: string
}

/**
 * Service events
 */
export interface PluginManagerEvents {
  'search:start': (query: string) => void
  'search:complete': (results: PluginSearchResult[]) => void
  'search:error': (error: Error) => void
  'install:start': (packageName: string) => void
  'install:progress': (packageName: string, downloaded: number, total: number) => void
  'install:complete': (result: InstallResult) => void
  'install:error': (packageName: string, error: Error) => void
  'uninstall:start': (pluginId: string) => void
  'uninstall:complete': (pluginId: string, success: boolean) => void
  'uninstall:error': (pluginId: string, error: Error) => void
  'update:start': (pluginId: string) => void
  'update:complete': (result: InstallResult) => void
  'update:error': (pluginId: string, error: Error) => void
}

/**
 * Service configuration
 */
export interface PluginManagerConfig {
  registry?: RegistryClientConfig
  validator?: ValidatorConfig
  pluginsDir?: string
}

/**
 * Plugin Manager Service
 * 
 * Main service for managing plugin operations.
 */
export class PluginManagerService extends EventEmitter {
  private readonly registryClient: NpmRegistryClient
  private readonly validator: PluginValidator
  private readonly installer: PluginInstaller

  constructor(config: PluginManagerConfig = {}) {
    super()
    this.registryClient = createRegistryClient(config.registry)
    this.validator = createValidator(config.validator)
    this.installer = createInstaller(config.pluginsDir)
  }

  /**
   * Search for plugins in the NPM registry
   * 
   * @param options - Search options
   * @returns Array of search results with validation status
   */
  async searchPlugins(options: SearchOptions): Promise<PluginSearchResult[]> {
    this.emit('search:start', options.query)

    try {
      const results = await this.registryClient.searchPlugins(
        options.query,
        {
          size: options.size,
          from: options.from
        }
      )

      // Enhance results with compatibility information
      const enhancedResults: PluginSearchResult[] = await Promise.all(
        results.map(async (result) => {
          try {
            // Get package metadata to check compatibility
            const metadata = await this.registryClient.getPluginMetadata(
              result.package.name
            )

            // Try to parse manifest from package
            // Note: We can't validate without downloading, so we do basic checks
            const manifest: Partial<PluginManifest> = {
              id: result.package.name.replace(/[@\/]/g, '-'),
              name: result.package.name,
              version: result.package.version,
              engines: metadata.engines
            }

            // Check compatibility
            const compatResult = this.validator.validateCompatibility(
              manifest as PluginManifest
            )

            return {
              ...result,
              compatible: compatResult.valid,
              validationWarnings: compatResult.warnings.map(w => w.message)
            }
          } catch {
            // If we can't check compatibility, mark as unknown
            return {
              ...result,
              compatible: undefined,
              validationWarnings: ['Could not verify compatibility']
            }
          }
        })
      )

      this.emit('search:complete', enhancedResults)
      return enhancedResults
    } catch (error) {
      this.emit('search:error', error as Error)
      throw error
    }
  }

  /**
   * Install a plugin from NPM
   * 
   * @param packageName - NPM package name
   * @param version - Optional specific version (defaults to latest)
   * @param options - Installation options
   * @returns Installation result
   */
  async installPlugin(
    packageName: string,
    version?: string,
    options: PluginInstallOptions = {}
  ): Promise<InstallResult> {
    this.emit('install:start', packageName)

    try {
      // Get package metadata
      const metadata = await this.registryClient.getPluginMetadata(
        packageName,
        version
      )

      // Download and parse manifest
      const manifest = await this.downloadAndParseManifest(
        metadata.dist.tarball,
        packageName,
        metadata.version
      )

      // Validate plugin
      if (!options.skipValidation) {
        const validationResult = this.validator.validatePlugin(
          packageName,
          manifest,
          metadata
        )

        if (!validationResult.valid) {
          const errorMessages = validationResult.errors
            .map(e => e.message)
            .join('; ')
          throw new Error(`Plugin validation failed: ${errorMessages}`)
        }

        // Log warnings
        if (validationResult.warnings.length > 0) {
          console.warn(
            `Plugin validation warnings for ${packageName}:`,
            validationResult.warnings.map(w => w.message)
          )
        }
      }

      // Set up progress callback
      const progressCallback: ProgressCallback | undefined = options.onProgress
        ? (downloaded, total) => {
            this.emit('install:progress', packageName, downloaded, total)
            options.onProgress!(downloaded, total)
          }
        : undefined

      // Install plugin
      const result = await this.installer.install(
        packageName,
        metadata,
        manifest,
        {
          force: options.force,
          skipValidation: options.skipValidation
        },
        progressCallback
      )

      this.emit('install:complete', result)
      return result
    } catch (error) {
      this.emit('install:error', packageName, error as Error)
      throw error
    }
  }

  /**
   * Uninstall a plugin
   * 
   * @param pluginId - Plugin ID to uninstall
   * @returns True if uninstalled, false if not found
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    this.emit('uninstall:start', pluginId)

    try {
      const success = await this.installer.uninstall(pluginId)
      this.emit('uninstall:complete', pluginId, success)
      return success
    } catch (error) {
      this.emit('uninstall:error', pluginId, error as Error)
      throw error
    }
  }

  /**
   * Update a plugin to the latest version
   * 
   * @param pluginId - Plugin ID to update
   * @param packageName - NPM package name
   * @param options - Installation options
   * @returns Installation result
   */
  async updatePlugin(
    pluginId: string,
    packageName: string,
    options: PluginInstallOptions = {}
  ): Promise<InstallResult> {
    this.emit('update:start', pluginId)

    try {
      // Force reinstall for updates
      const result = await this.installPlugin(
        packageName,
        undefined, // Use latest version
        {
          ...options,
          force: true
        }
      )

      this.emit('update:complete', result)
      return result
    } catch (error) {
      this.emit('update:error', pluginId, error as Error)
      throw error
    }
  }

  /**
   * Check for plugin updates
   * 
   * @param pluginId - Plugin ID
   * @param packageName - NPM package name
   * @param currentVersion - Current installed version
   * @returns Update information
   */
  async checkForUpdates(
    pluginId: string,
    packageName: string,
    currentVersion: string
  ): Promise<PluginUpdateInfo> {
    try {
      const versions = await this.registryClient.getPluginVersions(packageName)
      const latestVersion = versions['dist-tags'].latest

      return {
        pluginId,
        currentVersion,
        latestVersion,
        updateAvailable: currentVersion !== latestVersion
      }
    } catch (error) {
      throw new Error(
        `Failed to check for updates: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get detailed information about a plugin
   * 
   * @param packageName - NPM package name
   * @param version - Optional specific version
   * @returns Package metadata and validation result
   */
  async getPluginInfo(
    packageName: string,
    version?: string
  ): Promise<{
    metadata: NpmPackageMetadata
    validation: ValidationResult
  }> {
    const metadata = await this.registryClient.getPluginMetadata(
      packageName,
      version
    )

    // Download and parse manifest for validation
    const manifest = await this.downloadAndParseManifest(
      metadata.dist.tarball,
      packageName,
      metadata.version
    )

    const validation = this.validator.validatePlugin(
      packageName,
      manifest,
      metadata
    )

    return {
      metadata,
      validation
    }
  }

  /**
   * Download tarball and parse plugin manifest
   * 
   * This is a helper method that downloads the tarball temporarily
   * just to extract and parse the plugin.json manifest.
   * 
   * @param tarballUrl - URL to tarball
   * @param packageName - Package name
   * @param version - Package version
   * @returns Parsed plugin manifest
   */
  private async downloadAndParseManifest(
    _tarballUrl: string,
    packageName: string,
    version: string
  ): Promise<PluginManifest> {
    // For now, we'll create a basic manifest from package metadata
    // In a full implementation, we would download and extract the tarball
    // to read the actual plugin.json file
    
    // This is a simplified approach - in production, you'd want to:
    // 1. Download the tarball
    // 2. Extract just the plugin.json file
    // 3. Parse and return it
    // 4. Clean up the temp file
    
    // For now, return a basic manifest structure
    const pluginId = packageName.replace(/[@\/]/g, '-')
    
    return {
      id: pluginId,
      name: packageName,
      version: version
    }
  }

  /**
   * Get the NPM plugins directory path
   */
  getPluginsDirectory(): string {
    return this.installer.getNpmPluginsDir()
  }

  /**
   * Typed event emitter methods
   */
  on<K extends keyof PluginManagerEvents>(
    event: K,
    listener: PluginManagerEvents[K]
  ): this {
    return super.on(event, listener)
  }

  emit<K extends keyof PluginManagerEvents>(
    event: K,
    ...args: Parameters<PluginManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }
}

/**
 * Create a default plugin manager service instance
 */
export function createPluginManagerService(
  config?: PluginManagerConfig
): PluginManagerService {
  return new PluginManagerService(config)
}
