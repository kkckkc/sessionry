/**
 * Plugin Installer
 * 
 * Handles downloading, extracting, installing, and uninstalling plugins.
 */

import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import { createWriteStream, createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createHash } from 'crypto'
import * as tar from 'tar'
import { app } from 'electron'
import type { NpmPackageMetadata } from './registryClient'
import type { PluginManifest } from './pluginValidator'

/**
 * Installation options
 */
export interface InstallOptions {
  force?: boolean // Force reinstall even if already installed
  skipValidation?: boolean // Skip integrity validation (not recommended)
}

/**
 * Installation result
 */
export interface InstallResult {
  success: boolean
  pluginId: string
  version: string
  installedPath: string
  error?: string
}

/**
 * Download progress callback
 */
export type ProgressCallback = (downloaded: number, total: number) => void

/**
 * Installer error
 */
export class InstallerError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'InstallerError'
  }
}

/**
 * Plugin Installer
 * 
 * Manages the installation and removal of plugins from NPM packages.
 */
export class PluginInstaller {
  private readonly pluginsDir: string
  private readonly npmPluginsDir: string
  private readonly tempDir: string

  constructor(pluginsDir?: string) {
    const userDataPath = app.getPath('userData')
    this.pluginsDir = pluginsDir || path.join(userDataPath, 'plugins')
    this.npmPluginsDir = path.join(this.pluginsDir, 'npm')
    this.tempDir = path.join(userDataPath, 'temp', 'plugin-downloads')
  }

  /**
   * Install a plugin from NPM
   * 
   * @param packageName - NPM package name
   * @param metadata - Package metadata from registry
   * @param manifest - Plugin manifest (already validated)
   * @param options - Installation options
   * @param onProgress - Progress callback
   * @returns Installation result
   */
  async install(
    packageName: string,
    metadata: NpmPackageMetadata,
    manifest: PluginManifest,
    options: InstallOptions = {},
    onProgress?: ProgressCallback
  ): Promise<InstallResult> {
    try {
      // Ensure directories exist
      await this.ensureDirectories()

      // Check if already installed
      const pluginDir = path.join(this.npmPluginsDir, manifest.id)
      const exists = await this.directoryExists(pluginDir)

      if (exists && !options.force) {
        throw new InstallerError(
          `Plugin "${manifest.id}" is already installed. Use force option to reinstall.`,
          'ALREADY_INSTALLED'
        )
      }

      // Download tarball
      const tarballPath = await this.download(
        metadata.dist.tarball,
        packageName,
        metadata.version,
        onProgress
      )

      // Verify integrity
      if (!options.skipValidation) {
        await this.verifyIntegrity(
          tarballPath,
          metadata.dist.shasum,
          metadata.dist.integrity
        )
      }

      // Extract to plugin directory
      await this.extract(tarballPath, pluginDir, manifest.id)

      // Clean up temp file
      await fs.unlink(tarballPath).catch(() => {
        // Ignore cleanup errors
      })

      return {
        success: true,
        pluginId: manifest.id,
        version: metadata.version,
        installedPath: pluginDir
      }
    } catch (error) {
      if (error instanceof InstallerError) {
        throw error
      }

      throw new InstallerError(
        `Failed to install plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSTALL_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Uninstall a plugin
   * 
   * @param pluginId - Plugin ID to uninstall
   * @returns True if uninstalled, false if not found
   */
  async uninstall(pluginId: string): Promise<boolean> {
    try {
      const pluginDir = path.join(this.npmPluginsDir, pluginId)
      const exists = await this.directoryExists(pluginDir)

      if (!exists) {
        return false
      }

      // Remove plugin directory
      await fs.rm(pluginDir, { recursive: true, force: true })

      return true
    } catch (error) {
      throw new InstallerError(
        `Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNINSTALL_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Download a tarball from URL
   * 
   * @param url - Tarball URL
   * @param packageName - Package name (for temp file naming)
   * @param version - Package version
   * @param onProgress - Progress callback
   * @returns Path to downloaded file
   */
  async download(
    url: string,
    packageName: string,
    version: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    await this.ensureDirectories()

    // Create safe filename
    const safePackageName = packageName.replace(/[@\/]/g, '-')
    const filename = `${safePackageName}-${version}.tgz`
    const filePath = path.join(this.tempDir, filename)

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          const redirectUrl = response.headers.location
          if (!redirectUrl) {
            reject(new InstallerError('Redirect without location', 'DOWNLOAD_FAILED'))
            return
          }
          this.download(redirectUrl, packageName, version, onProgress)
            .then(resolve)
            .catch(reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new InstallerError(
            `Download failed with status ${response.statusCode}`,
            'DOWNLOAD_FAILED'
          ))
          return
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloadedSize = 0

        const fileStream = createWriteStream(filePath)

        response.on('data', (chunk) => {
          downloadedSize += chunk.length
          if (onProgress && totalSize > 0) {
            onProgress(downloadedSize, totalSize)
          }
        })

        response.on('error', (error) => {
          fileStream.close()
          fs.unlink(filePath).catch(() => {})
          reject(new InstallerError(
            `Download error: ${error.message}`,
            'DOWNLOAD_FAILED',
            error
          ))
        })

        fileStream.on('error', (error) => {
          fileStream.close()
          fs.unlink(filePath).catch(() => {})
          reject(new InstallerError(
            `File write error: ${error.message}`,
            'DOWNLOAD_FAILED',
            error
          ))
        })

        fileStream.on('finish', () => {
          fileStream.close()
          resolve(filePath)
        })

        response.pipe(fileStream)
      }).on('error', (error) => {
        reject(new InstallerError(
          `Network error: ${error.message}`,
          'DOWNLOAD_FAILED',
          error
        ))
      })
    })
  }

  /**
   * Verify tarball integrity using checksums
   * 
   * @param filePath - Path to tarball
   * @param shasum - Expected SHA1 checksum
   * @param integrity - Expected SRI integrity string (optional)
   */
  async verifyIntegrity(
    filePath: string,
    shasum?: string,
    integrity?: string
  ): Promise<void> {
    if (!shasum && !integrity) {
      throw new InstallerError(
        'No integrity checksums provided',
        'MISSING_CHECKSUMS'
      )
    }

    // Verify SHA1 if provided
    if (shasum) {
      const actualShasum = await this.calculateChecksum(filePath, 'sha1')
      if (actualShasum !== shasum) {
        throw new InstallerError(
          `SHA1 checksum mismatch. Expected: ${shasum}, Got: ${actualShasum}`,
          'CHECKSUM_MISMATCH'
        )
      }
    }

    // Verify SRI integrity if provided
    if (integrity) {
      const match = integrity.match(/^(sha\d+)-(.+)$/)
      if (!match) {
        throw new InstallerError(
          `Invalid integrity format: ${integrity}`,
          'INVALID_INTEGRITY'
        )
      }

      const [, algorithm, expectedHash] = match
      const actualHash = await this.calculateChecksum(filePath, algorithm)
      const actualHashBase64 = Buffer.from(actualHash, 'hex').toString('base64')

      if (actualHashBase64 !== expectedHash) {
        throw new InstallerError(
          `${algorithm.toUpperCase()} integrity mismatch`,
          'CHECKSUM_MISMATCH'
        )
      }
    }
  }

  /**
   * Extract tarball to destination directory
   * 
   * @param tarballPath - Path to tarball
   * @param destDir - Destination directory
   * @param pluginId - Plugin ID (for validation)
   */
  async extract(
    tarballPath: string,
    destDir: string,
    pluginId: string
  ): Promise<void> {
    try {
      // Remove existing directory if it exists
      await fs.rm(destDir, { recursive: true, force: true })

      // Create destination directory
      await fs.mkdir(destDir, { recursive: true })

      // Extract tarball
      // NPM tarballs have a 'package/' prefix that we need to strip
      await tar.extract({
        file: tarballPath,
        cwd: destDir,
        strip: 1 // Strip the 'package/' prefix
      })

      // Verify plugin.json exists
      const manifestPath = path.join(destDir, 'plugin.json')
      const manifestExists = await this.fileExists(manifestPath)

      if (!manifestExists) {
        throw new InstallerError(
          'Extracted package does not contain plugin.json',
          'INVALID_PACKAGE'
        )
      }

      // Verify plugin ID matches
      const manifestContent = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent) as PluginManifest

      if (manifest.id !== pluginId) {
        throw new InstallerError(
          `Plugin ID mismatch. Expected: ${pluginId}, Got: ${manifest.id}`,
          'PLUGIN_ID_MISMATCH'
        )
      }
    } catch (error) {
      // Clean up on error
      await fs.rm(destDir, { recursive: true, force: true }).catch(() => {})

      if (error instanceof InstallerError) {
        throw error
      }

      throw new InstallerError(
        `Failed to extract tarball: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXTRACT_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Calculate checksum of a file
   * 
   * @param filePath - Path to file
   * @param algorithm - Hash algorithm (sha1, sha256, sha512)
   * @returns Hex-encoded checksum
   */
  private async calculateChecksum(
    filePath: string,
    algorithm: string
  ): Promise<string> {
    const hash = createHash(algorithm)
    const stream = createReadStream(filePath)

    await pipeline(stream, hash)

    return hash.digest('hex')
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.pluginsDir, { recursive: true })
    await fs.mkdir(this.npmPluginsDir, { recursive: true })
    await fs.mkdir(this.tempDir, { recursive: true })
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath)
      return stat.isFile()
    } catch {
      return false
    }
  }

  /**
   * Get the NPM plugins directory path
   */
  getNpmPluginsDir(): string {
    return this.npmPluginsDir
  }

  /**
   * Get the temp directory path
   */
  getTempDir(): string {
    return this.tempDir
  }
}

/**
 * Create a default plugin installer instance
 */
export function createInstaller(pluginsDir?: string): PluginInstaller {
  return new PluginInstaller(pluginsDir)
}
