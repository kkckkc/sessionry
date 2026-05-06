/**
 * Tests for Plugin Validator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginValidator, createValidator, type PluginManifest } from './pluginValidator';
import type { NpmPackageMetadata } from './registryClient';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0'
  }
}));

// Mock process.versions
Object.defineProperty(process.versions, 'electron', {
  value: '28.0.0',
  writable: true
});

Object.defineProperty(process.versions, 'node', {
  value: '18.17.0',
  writable: true
});

describe('PluginValidator', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator({
      sessionryVersion: '1.0.0',
      electronVersion: '28.0.0',
      nodeVersion: '18.17.0'
    });
  });

  describe('validateManifest', () => {
    it('should validate a valid manifest', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        main: 'dist/main.js',
        renderer: 'dist/renderer.js',
        keywords: ['sessionry-plugin']
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object manifest', () => {
      const result = validator.validateManifest(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_MANIFEST',
          severity: 'error'
        })
      );
    });

    it('should reject manifest without id', () => {
      const manifest = {
        name: 'Test Plugin',
        version: '1.0.0'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_ID',
          field: 'id',
          severity: 'error'
        })
      );
    });

    it('should reject manifest with invalid id format', () => {
      const manifest = {
        id: 'Test_Plugin!',
        name: 'Test Plugin',
        version: '1.0.0'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ID',
          field: 'id',
          severity: 'error'
        })
      );
    });

    it('should accept valid id formats', () => {
      const validIds = ['test-plugin', 'plugin123', 'my-awesome-plugin-2'];

      for (const id of validIds) {
        const manifest = {
          id,
          name: 'Test Plugin',
          version: '1.0.0'
        };

        const result = validator.validateManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject manifest without name', () => {
      const manifest = {
        id: 'test-plugin',
        version: '1.0.0'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_NAME',
          field: 'name',
          severity: 'error'
        })
      );
    });

    it('should reject manifest without version', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_VERSION',
          field: 'version',
          severity: 'error'
        })
      );
    });

    it('should reject manifest with invalid semver version', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: 'not-a-version'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_VERSION',
          field: 'version',
          severity: 'error'
        })
      );
    });

    it('should accept valid semver versions', () => {
      const validVersions = ['1.0.0', '0.1.0', '2.3.4-beta.1', '1.0.0-alpha+001'];

      for (const version of validVersions) {
        const manifest = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version
        };

        const result = validator.validateManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate engines field', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          sessionry: '^1.0.0',
          electron: '>=28.0.0',
          node: '>=18.0.0'
        }
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid engine version ranges', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          sessionry: 'not-a-range'
        }
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ENGINE_RANGE',
          field: 'engines.sessionry',
          severity: 'error'
        })
      );
    });

    it('should warn about missing sessionry-plugin keyword', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        keywords: ['other', 'keywords']
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_SESSIONRY_KEYWORD',
          severity: 'warning'
        })
      );
    });

    it('should not require keywords when requireKeywords is false', () => {
      const validatorNoKeywords = new PluginValidator({
        requireKeywords: false
      });

      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
      };

      const result = validatorNoKeywords.validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings).not.toContainEqual(
        expect.objectContaining({
          code: 'MISSING_KEYWORDS'
        })
      );
    });

    it('should validate dependencies field', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        dependencies: {
          'some-package': '^1.0.0'
        }
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid dependencies field', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        dependencies: 'not-an-object'
      };

      const result = validator.validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_DEPENDENCIES',
          severity: 'error'
        })
      );
    });
  });

  describe('validateCompatibility', () => {
    it('should validate compatible plugin', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          sessionry: '^1.0.0',
          electron: '>=28.0.0',
          node: '>=18.0.0'
        }
      };

      const result = validator.validateCompatibility(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject incompatible Sessionry version', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          sessionry: '^2.0.0' // Requires v2, but we have v1
        }
      };

      const result = validator.validateCompatibility(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPATIBLE_SESSIONRY_VERSION',
          field: 'engines.sessionry',
          severity: 'error'
        })
      );
    });

    it('should warn about incompatible Electron version', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          electron: '^30.0.0' // Prefers v30, but we have v28
        }
      };

      const result = validator.validateCompatibility(manifest);

      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPATIBLE_ELECTRON_VERSION',
          severity: 'warning'
        })
      );
    });

    it('should warn about incompatible Node version', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          node: '>=20.0.0' // Prefers v20, but we have v18
        }
      };

      const result = validator.validateCompatibility(manifest);

      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPATIBLE_NODE_VERSION',
          severity: 'warning'
        })
      );
    });

    it('should warn about missing Sessionry version in strict mode', () => {
      const strictValidator = new PluginValidator({
        strictMode: true
      });

      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
        // No engines specified
      };

      const result = strictValidator.validateCompatibility(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_SESSIONRY_VERSION',
          severity: 'warning'
        })
      );
    });

    it('should accept various version range formats', () => {
      const ranges = ['^1.0.0', '~1.0.0', '>=1.0.0', '1.x', '1.0.x', '*'];

      for (const range of ranges) {
        const manifest: PluginManifest = {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          engines: {
            sessionry: range
          }
        };

        const result = validator.validateCompatibility(manifest);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('validateSecurity', () => {
    it('should validate secure plugin', () => {
      const metadata: NpmPackageMetadata = {
        name: '@sessionry/plugin-test',
        version: '1.0.0',
        license: 'MIT',
        repository: {
          type: 'git',
          url: 'https://github.com/sessionry/plugin-test'
        },
        dist: {
          tarball: 'https://registry.npmjs.org/@sessionry/plugin-test/-/plugin-test-1.0.0.tgz',
          shasum: 'abc123',
          integrity: 'sha512-xyz'
        }
      };

      const result = validator.validateSecurity('@sessionry/plugin-test', metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject blocked packages', () => {
      const blockedValidator = new PluginValidator({
        blockedPackages: ['malicious-package']
      });

      const metadata: NpmPackageMetadata = {
        name: 'malicious-package',
        version: '1.0.0',
        dist: {
          tarball: 'https://registry.npmjs.org/malicious-package/-/malicious-package-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = blockedValidator.validateSecurity('malicious-package', metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'BLOCKED_PACKAGE',
          severity: 'error'
        })
      );
    });

    it('should reject disallowed licenses in strict mode', () => {
      const strictValidator = new PluginValidator({
        strictMode: true,
        allowedLicenses: ['MIT', 'Apache-2.0']
      });

      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'GPL-3.0',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = strictValidator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DISALLOWED_LICENSE',
          severity: 'error'
        })
      );
    });

    it('should warn about disallowed licenses in non-strict mode', () => {
      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'GPL-3.0',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = validator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DISALLOWED_LICENSE',
          severity: 'warning'
        })
      );
    });

    it('should warn about missing license', () => {
      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = validator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_LICENSE',
          severity: 'warning'
        })
      );
    });

    it('should warn about suspicious dependencies', () => {
      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'MIT',
        dependencies: {
          'child_process': '^1.0.0',
          'fs-extra': '^10.0.0'
        },
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = validator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SUSPICIOUS_DEPENDENCY',
          severity: 'warning'
        })
      );
    });

    it('should reject packages without integrity checksums', () => {
      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'MIT',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz'
        } as any
      };

      const result = validator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_INTEGRITY',
          severity: 'error'
        })
      );
    });

    it('should warn about missing repository', () => {
      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'MIT',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = validator.validateSecurity('test-plugin', metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_REPOSITORY',
          severity: 'warning'
        })
      );
    });
  });

  describe('validatePlugin', () => {
    it('should perform complete validation', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        engines: {
          sessionry: '^1.0.0'
        },
        keywords: ['sessionry-plugin']
      };

      const metadata: NpmPackageMetadata = {
        name: '@sessionry/plugin-test',
        version: '1.0.0',
        license: 'MIT',
        repository: {
          type: 'git',
          url: 'https://github.com/sessionry/plugin-test'
        },
        dist: {
          tarball: 'https://registry.npmjs.org/@sessionry/plugin-test/-/plugin-test-1.0.0.tgz',
          shasum: 'abc123',
          integrity: 'sha512-xyz'
        }
      };

      const result = validator.validatePlugin('@sessionry/plugin-test', manifest, metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should combine errors from all validation steps', () => {
      const manifest = {
        // Missing required fields
        version: 'invalid'
      } as any;

      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        license: 'UNKNOWN',
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz'
        } as any
      };

      const result = validator.validatePlugin('test-plugin', manifest, metadata);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should have errors from manifest validation
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_ID'
        })
      );

      // Should have errors from security validation
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_INTEGRITY'
        })
      );
    });

    it('should combine warnings from all validation steps', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
        // Missing engines and keywords
      };

      const metadata: NpmPackageMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        // Missing license and repository
        dist: {
          tarball: 'https://registry.npmjs.org/test-plugin/-/test-plugin-1.0.0.tgz',
          shasum: 'abc123'
        }
      };

      const result = validator.validatePlugin('test-plugin', manifest, metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('createValidator', () => {
    it('should create a validator with default config', () => {
      const validator = createValidator();
      expect(validator).toBeInstanceOf(PluginValidator);
    });

    it('should create a validator with custom config', () => {
      const validator = createValidator({
        strictMode: true,
        allowedLicenses: ['MIT']
      });
      expect(validator).toBeInstanceOf(PluginValidator);
    });
  });
});
