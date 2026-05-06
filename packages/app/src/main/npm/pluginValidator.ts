/**
 * Plugin Validator
 *
 * Validates plugin manifests, compatibility, and security before installation.
 */

import { satisfies, valid, validRange } from 'semver';
import { app } from 'electron';
import type { NpmPackageMetadata } from './registryClient';

/**
 * Plugin manifest structure (plugin.json)
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  main?: string;
  renderer?: string;
  engines?: {
    sessionry?: string;
    electron?: string;
    node?: string;
  };
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  severity: 'warning';
}

/**
 * Validator configuration
 */
export interface ValidatorConfig {
  sessionryVersion?: string;
  electronVersion?: string;
  nodeVersion?: string;
  allowedLicenses?: string[];
  blockedPackages?: string[];
  requireKeywords?: boolean;
  strictMode?: boolean;
}

/**
 * Plugin Validator
 *
 * Validates plugins before installation to ensure compatibility and security.
 */
export class PluginValidator {
  private readonly sessionryVersion: string;
  private readonly electronVersion: string;
  private readonly nodeVersion: string;
  private readonly allowedLicenses: string[];
  private readonly blockedPackages: Set<string>;
  private readonly requireKeywords: boolean;
  private readonly strictMode: boolean;

  constructor(config: ValidatorConfig = {}) {
    this.sessionryVersion = config.sessionryVersion || app.getVersion();
    this.electronVersion = config.electronVersion || process.versions.electron;
    this.nodeVersion = config.nodeVersion || process.versions.node;
    this.allowedLicenses = config.allowedLicenses || [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'CC0-1.0',
      'Unlicense'
    ];
    this.blockedPackages = new Set(config.blockedPackages || []);
    this.requireKeywords = config.requireKeywords ?? true;
    this.strictMode = config.strictMode ?? false;
  }

  /**
   * Validate a plugin manifest
   *
   * @param manifest - Plugin manifest to validate
   * @returns Validation result
   */
  validateManifest(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if manifest is an object
    if (!manifest || typeof manifest !== 'object') {
      errors.push({
        code: 'INVALID_MANIFEST',
        message: 'Plugin manifest must be a valid JSON object',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    const m = manifest as Partial<PluginManifest>;

    // Validate required fields
    if (!m.id || typeof m.id !== 'string') {
      errors.push({
        code: 'MISSING_ID',
        message: 'Plugin manifest must have a valid "id" field',
        field: 'id',
        severity: 'error'
      });
    } else if (!/^[a-z0-9-]+$/.test(m.id)) {
      errors.push({
        code: 'INVALID_ID',
        message: 'Plugin ID must contain only lowercase letters, numbers, and hyphens',
        field: 'id',
        severity: 'error'
      });
    }

    if (!m.name || typeof m.name !== 'string') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Plugin manifest must have a valid "name" field',
        field: 'name',
        severity: 'error'
      });
    }

    if (!m.version || typeof m.version !== 'string') {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Plugin manifest must have a valid "version" field',
        field: 'version',
        severity: 'error'
      });
    } else if (!valid(m.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: `Plugin version "${m.version}" is not a valid semver version`,
        field: 'version',
        severity: 'error'
      });
    }

    // Validate optional fields
    if (m.main && typeof m.main !== 'string') {
      errors.push({
        code: 'INVALID_MAIN',
        message: 'Plugin "main" field must be a string',
        field: 'main',
        severity: 'error'
      });
    }

    if (m.renderer && typeof m.renderer !== 'string') {
      errors.push({
        code: 'INVALID_RENDERER',
        message: 'Plugin "renderer" field must be a string',
        field: 'renderer',
        severity: 'error'
      });
    }

    // Validate engines
    if (m.engines) {
      if (typeof m.engines !== 'object') {
        errors.push({
          code: 'INVALID_ENGINES',
          message: 'Plugin "engines" field must be an object',
          field: 'engines',
          severity: 'error'
        });
      } else {
        // Validate engine version ranges
        for (const [engine, range] of Object.entries(m.engines)) {
          if (typeof range !== 'string') {
            errors.push({
              code: 'INVALID_ENGINE_RANGE',
              message: `Engine "${engine}" must have a string version range`,
              field: `engines.${engine}`,
              severity: 'error'
            });
          } else if (!validRange(range)) {
            errors.push({
              code: 'INVALID_ENGINE_RANGE',
              message: `Engine "${engine}" has invalid version range: ${range}`,
              field: `engines.${engine}`,
              severity: 'error'
            });
          }
        }
      }
    }

    // Validate keywords
    if (this.requireKeywords) {
      if (!m.keywords || !Array.isArray(m.keywords)) {
        warnings.push({
          code: 'MISSING_KEYWORDS',
          message: 'Plugin should have keywords for better discoverability',
          field: 'keywords',
          severity: 'warning'
        });
      } else if (!m.keywords.includes('sessionry-plugin')) {
        warnings.push({
          code: 'MISSING_SESSIONRY_KEYWORD',
          message: 'Plugin should include "sessionry-plugin" keyword',
          field: 'keywords',
          severity: 'warning'
        });
      }
    }

    // Validate dependencies
    if (m.dependencies && typeof m.dependencies !== 'object') {
      errors.push({
        code: 'INVALID_DEPENDENCIES',
        message: 'Plugin "dependencies" field must be an object',
        field: 'dependencies',
        severity: 'error'
      });
    }

    if (m.peerDependencies && typeof m.peerDependencies !== 'object') {
      errors.push({
        code: 'INVALID_PEER_DEPENDENCIES',
        message: 'Plugin "peerDependencies" field must be an object',
        field: 'peerDependencies',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin compatibility with current environment
   *
   * @param manifest - Plugin manifest
   * @returns Validation result
   */
  validateCompatibility(manifest: PluginManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check Sessionry version compatibility
    if (manifest.engines?.sessionry) {
      const range = manifest.engines.sessionry;
      if (!validRange(range)) {
        errors.push({
          code: 'INVALID_SESSIONRY_RANGE',
          message: `Invalid Sessionry version range: ${range}`,
          field: 'engines.sessionry',
          severity: 'error'
        });
      } else if (!satisfies(this.sessionryVersion, range)) {
        errors.push({
          code: 'INCOMPATIBLE_SESSIONRY_VERSION',
          message: `Plugin requires Sessionry ${range}, but current version is ${this.sessionryVersion}`,
          field: 'engines.sessionry',
          severity: 'error'
        });
      }
    } else if (this.strictMode) {
      warnings.push({
        code: 'MISSING_SESSIONRY_VERSION',
        message: 'Plugin does not specify required Sessionry version',
        field: 'engines.sessionry',
        severity: 'warning'
      });
    }

    // Check Electron version compatibility
    if (manifest.engines?.electron) {
      const range = manifest.engines.electron;
      if (!validRange(range)) {
        errors.push({
          code: 'INVALID_ELECTRON_RANGE',
          message: `Invalid Electron version range: ${range}`,
          field: 'engines.electron',
          severity: 'error'
        });
      } else if (!satisfies(this.electronVersion, range)) {
        warnings.push({
          code: 'INCOMPATIBLE_ELECTRON_VERSION',
          message: `Plugin prefers Electron ${range}, but current version is ${this.electronVersion}`,
          field: 'engines.electron',
          severity: 'warning'
        });
      }
    }

    // Check Node.js version compatibility
    if (manifest.engines?.node) {
      const range = manifest.engines.node;
      if (!validRange(range)) {
        errors.push({
          code: 'INVALID_NODE_RANGE',
          message: `Invalid Node.js version range: ${range}`,
          field: 'engines.node',
          severity: 'error'
        });
      } else if (!satisfies(this.nodeVersion, range)) {
        warnings.push({
          code: 'INCOMPATIBLE_NODE_VERSION',
          message: `Plugin prefers Node.js ${range}, but current version is ${this.nodeVersion}`,
          field: 'engines.node',
          severity: 'warning'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin security
   *
   * @param packageName - NPM package name
   * @param metadata - NPM package metadata
   * @returns Validation result
   */
  validateSecurity(packageName: string, metadata: NpmPackageMetadata): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if package is blocked
    if (this.blockedPackages.has(packageName)) {
      errors.push({
        code: 'BLOCKED_PACKAGE',
        message: `Package "${packageName}" is blocked due to security concerns`,
        severity: 'error'
      });
    }

    // Check license
    if (metadata.license) {
      const license = typeof metadata.license === 'string' ? metadata.license : metadata.license;

      if (!this.allowedLicenses.includes(license)) {
        if (this.strictMode) {
          errors.push({
            code: 'DISALLOWED_LICENSE',
            message: `Package license "${license}" is not in the allowed list`,
            field: 'license',
            severity: 'error'
          });
        } else {
          warnings.push({
            code: 'DISALLOWED_LICENSE',
            message: `Package license "${license}" is not in the allowed list`,
            field: 'license',
            severity: 'warning'
          });
        }
      }
    } else {
      warnings.push({
        code: 'MISSING_LICENSE',
        message: 'Package does not specify a license',
        field: 'license',
        severity: 'warning'
      });
    }

    // Check for suspicious dependencies
    if (metadata.dependencies) {
      const suspiciousPatterns = [
        /^(eval|exec|child_process|vm2?)$/i,
        /^(fs-extra|rimraf)$/i, // File system manipulation
        /^(axios|node-fetch|request)$/i // Network access (warn only)
      ];

      for (const dep of Object.keys(metadata.dependencies)) {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(dep)) {
            warnings.push({
              code: 'SUSPICIOUS_DEPENDENCY',
              message: `Package depends on potentially dangerous module: ${dep}`,
              field: 'dependencies',
              severity: 'warning'
            });
          }
        }
      }
    }

    // Check package integrity
    if (!metadata.dist?.shasum && !metadata.dist?.integrity) {
      errors.push({
        code: 'MISSING_INTEGRITY',
        message: 'Package does not have integrity checksums',
        severity: 'error'
      });
    }

    // Check for repository information
    if (!metadata.repository) {
      warnings.push({
        code: 'MISSING_REPOSITORY',
        message: 'Package does not specify a repository',
        field: 'repository',
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a complete plugin package
   *
   * Combines manifest, compatibility, and security validation.
   *
   * @param packageName - NPM package name
   * @param manifest - Plugin manifest
   * @param metadata - NPM package metadata
   * @returns Combined validation result
   */
  validatePlugin(
    packageName: string,
    manifest: PluginManifest,
    metadata: NpmPackageMetadata
  ): ValidationResult {
    const manifestResult = this.validateManifest(manifest);
    const compatibilityResult = this.validateCompatibility(manifest);
    const securityResult = this.validateSecurity(packageName, metadata);

    return {
      valid: manifestResult.valid && compatibilityResult.valid && securityResult.valid,
      errors: [...manifestResult.errors, ...compatibilityResult.errors, ...securityResult.errors],
      warnings: [
        ...manifestResult.warnings,
        ...compatibilityResult.warnings,
        ...securityResult.warnings
      ]
    };
  }
}

/**
 * Create a default plugin validator instance
 */
export function createValidator(config?: ValidatorConfig): PluginValidator {
  return new PluginValidator(config);
}
