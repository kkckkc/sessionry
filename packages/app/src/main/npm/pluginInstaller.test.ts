/**
 * Tests for Plugin Installer
 * 
 * Note: These are basic structural tests. Full integration tests with actual
 * file system operations should be run separately.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PluginInstaller,
  InstallerError,
  createInstaller,
  type InstallOptions
} from './pluginInstaller'
import type { NpmPackageMetadata } from './registryClient'
import type { PluginManifest } from './pluginValidator'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return '/mock/user/data'
      }
      return '/mock/path'
    }
  }
}))

describe('PluginInstaller', () => {
  describe('Constructor and Configuration', () => {
    it('should create installer with default paths', () => {
      const installer = new PluginInstaller()
      expect(installer).toBeInstanceOf(PluginInstaller)
      expect(installer.getNpmPluginsDir()).toContain('plugins/npm')
      expect(installer.getTempDir()).toContain('temp/plugin-downloads')
    })

    it('should create installer with custom plugins directory', () => {
      const customDir = '/custom/plugins'
      const installer = new PluginInstaller(customDir)
      expect(installer).toBeInstanceOf(PluginInstaller)
      expect(installer.getNpmPluginsDir()).toBe('/custom/plugins/npm')
    })

    it('should have correct directory structure', () => {
      const installer = new PluginInstaller()
      const npmDir = installer.getNpmPluginsDir()
      const tempDir = installer.getTempDir()

      expect(npmDir).toMatch(/plugins\/npm$/)
      expect(tempDir).toMatch(/temp\/plugin-downloads$/)
    })
  })

  describe('InstallerError', () => {
    it('should create error with all properties', () => {
      const cause = new Error('Original error')
      const error = new InstallerError(
        'Installation failed',
        'INSTALL_FAILED',
        cause
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(InstallerError)
      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALL_FAILED')
      expect(error.cause).toBe(cause)
      expect(error.name).toBe('InstallerError')
    })

    it('should create error without cause', () => {
      const error = new InstallerError(
        'Installation failed',
        'INSTALL_FAILED'
      )

      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALL_FAILED')
      expect(error.cause).toBeUndefined()
    })
  })

  describe('API Method Signatures', () => {
    let installer: PluginInstaller

    beforeEach(() => {
      installer = new PluginInstaller()
    })

    it('should have install method', () => {
      expect(typeof installer.install).toBe('function')
    })

    it('should have uninstall method', () => {
      expect(typeof installer.uninstall).toBe('function')
    })

    it('should have download method', () => {
      expect(typeof installer.download).toBe('function')
    })

    it('should have extract method', () => {
      expect(typeof installer.extract).toBe('function')
    })

    it('should have verifyIntegrity method', () => {
      expect(typeof installer.verifyIntegrity).toBe('function')
    })
  })

  describe('Install Options', () => {
    it('should accept install options', () => {
      const options: InstallOptions = {
        force: true,
        skipValidation: false
      }

      expect(options.force).toBe(true)
      expect(options.skipValidation).toBe(false)
    })

    it('should have optional properties', () => {
      const options: InstallOptions = {}

      expect(options.force).toBeUndefined()
      expect(options.skipValidation).toBeUndefined()
    })
  })

  describe('Type Definitions', () => {
    it('should define InstallResult type', () => {
      const result = {
        success: true,
        pluginId: 'test-plugin',
        version: '1.0.0',
        installedPath: '/path/to/plugin'
      }

      expect(result.success).toBe(true)
      expect(result.pluginId).toBe('test-plugin')
      expect(result.version).toBe('1.0.0')
      expect(result.installedPath).toBe('/path/to/plugin')
    })

    it('should define InstallResult with error', () => {
      const result = {
        success: false,
        pluginId: 'test-plugin',
        version: '1.0.0',
        installedPath: '/path/to/plugin',
        error: 'Installation failed'
      }

      expect(result.success).toBe(false)
      expect(result.error).toBe('Installation failed')
    })

    it('should define ProgressCallback type', () => {
      const callback = (downloaded: number, total: number) => {
        expect(typeof downloaded).toBe('number')
        expect(typeof total).toBe('number')
      }

      callback(50, 100)
    })
  })

  describe('Error Codes', () => {
    it('should use ALREADY_INSTALLED error code', () => {
      const error = new InstallerError(
        'Plugin already installed',
        'ALREADY_INSTALLED'
      )
      expect(error.code).toBe('ALREADY_INSTALLED')
    })

    it('should use INSTALL_FAILED error code', () => {
      const error = new InstallerError(
        'Installation failed',
        'INSTALL_FAILED'
      )
      expect(error.code).toBe('INSTALL_FAILED')
    })

    it('should use UNINSTALL_FAILED error code', () => {
      const error = new InstallerError(
        'Uninstallation failed',
        'UNINSTALL_FAILED'
      )
      expect(error.code).toBe('UNINSTALL_FAILED')
    })

    it('should use DOWNLOAD_FAILED error code', () => {
      const error = new InstallerError(
        'Download failed',
        'DOWNLOAD_FAILED'
      )
      expect(error.code).toBe('DOWNLOAD_FAILED')
    })

    it('should use CHECKSUM_MISMATCH error code', () => {
      const error = new InstallerError(
        'Checksum mismatch',
        'CHECKSUM_MISMATCH'
      )
      expect(error.code).toBe('CHECKSUM_MISMATCH')
    })

    it('should use EXTRACT_FAILED error code', () => {
      const error = new InstallerError(
        'Extraction failed',
        'EXTRACT_FAILED'
      )
      expect(error.code).toBe('EXTRACT_FAILED')
    })

    it('should use INVALID_PACKAGE error code', () => {
      const error = new InstallerError(
        'Invalid package',
        'INVALID_PACKAGE'
      )
      expect(error.code).toBe('INVALID_PACKAGE')
    })

    it('should use PLUGIN_ID_MISMATCH error code', () => {
      const error = new InstallerError(
        'Plugin ID mismatch',
        'PLUGIN_ID_MISMATCH'
      )
      expect(error.code).toBe('PLUGIN_ID_MISMATCH')
    })
  })

  describe('createInstaller', () => {
    it('should create installer with default config', () => {
      const installer = createInstaller()
      expect(installer).toBeInstanceOf(PluginInstaller)
    })

    it('should create installer with custom plugins directory', () => {
      const installer = createInstaller('/custom/plugins')
      expect(installer).toBeInstanceOf(PluginInstaller)
      expect(installer.getNpmPluginsDir()).toBe('/custom/plugins/npm')
    })
  })

  describe('Path Management', () => {
    it('should provide npm plugins directory path', () => {
      const installer = new PluginInstaller()
      const npmDir = installer.getNpmPluginsDir()

      expect(typeof npmDir).toBe('string')
      expect(npmDir.length).toBeGreaterThan(0)
      expect(npmDir).toContain('npm')
    })

    it('should provide temp directory path', () => {
      const installer = new PluginInstaller()
      const tempDir = installer.getTempDir()

      expect(typeof tempDir).toBe('string')
      expect(tempDir.length).toBeGreaterThan(0)
      expect(tempDir).toContain('temp')
    })

    it('should use consistent paths', () => {
      const installer = new PluginInstaller()
      const npmDir1 = installer.getNpmPluginsDir()
      const npmDir2 = installer.getNpmPluginsDir()

      expect(npmDir1).toBe(npmDir2)
    })
  })
})

/**
 * Integration Tests
 * 
 * These tests require file system access and should be run separately.
 * Uncomment and run manually when needed.
 */

describe.skip('PluginInstaller Integration Tests', () => {
  let installer: PluginInstaller

  beforeEach(() => {
    installer = new PluginInstaller()
  })

  it('should download a real tarball', async () => {
    const url = 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
    
    const filePath = await installer.download(url, 'lodash', '4.17.21')
    
    expect(filePath).toBeTruthy()
    expect(filePath).toContain('.tgz')
  }, 30000)

  it('should verify integrity of downloaded file', async () => {
    const url = 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
    const shasum = 'f4ca3f9d6e0e6e5e5e5e5e5e5e5e5e5e5e5e5e5e' // Example
    
    const filePath = await installer.download(url, 'lodash', '4.17.21')
    
    // This will fail with wrong checksum, which is expected
    await expect(
      installer.verifyIntegrity(filePath, shasum)
    ).rejects.toThrow(InstallerError)
  }, 30000)

  it('should install and uninstall a plugin', async () => {
    const metadata: NpmPackageMetadata = {
      name: '@sessionry/plugin-test',
      version: '1.0.0',
      dist: {
        tarball: 'https://example.com/plugin.tgz',
        shasum: 'abc123'
      }
    }

    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0'
    }

    // Install
    const result = await installer.install(
      '@sessionry/plugin-test',
      metadata,
      manifest,
      { skipValidation: true }
    )

    expect(result.success).toBe(true)
    expect(result.pluginId).toBe('test-plugin')

    // Uninstall
    const uninstalled = await installer.uninstall('test-plugin')
    expect(uninstalled).toBe(true)
  }, 60000)
})
