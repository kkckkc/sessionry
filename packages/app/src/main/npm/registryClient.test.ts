/**
 * Tests for NPM Registry Client
 *
 * Note: These are basic structural tests. Integration tests with real NPM registry
 * should be run separately to avoid network dependencies in unit tests.
 */

import { describe, it, expect } from 'vitest';
import { NpmRegistryClient, RegistryError, createRegistryClient } from './registryClient';

describe('NpmRegistryClient', () => {
  describe('Constructor and Configuration', () => {
    it('should create a client with default config', () => {
      const client = new NpmRegistryClient();
      expect(client).toBeInstanceOf(NpmRegistryClient);
    });

    it('should create a client with custom config', () => {
      const client = new NpmRegistryClient({
        registryUrl: 'https://custom-registry.example.com',
        timeout: 10000,
        retries: 5,
        retryDelay: 2000,
        userAgent: 'CustomAgent/1.0'
      });
      expect(client).toBeInstanceOf(NpmRegistryClient);
    });
  });

  describe('RegistryError', () => {
    it('should create error with all properties', () => {
      const error = new RegistryError('Test error', 'TEST_CODE', 404, new Error('Cause'));

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RegistryError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(404);
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.name).toBe('RegistryError');
    });

    it('should create error without optional properties', () => {
      const error = new RegistryError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    let client: NpmRegistryClient;

    beforeEach(() => {
      client = new NpmRegistryClient();
    });

    it('should reject empty package name in getPluginMetadata', async () => {
      await expect(client.getPluginMetadata('')).rejects.toThrow(RegistryError);
      await expect(client.getPluginMetadata('')).rejects.toThrow(/Package name is required/);
    });

    it('should reject empty package name in getPluginVersions', async () => {
      await expect(client.getPluginVersions('')).rejects.toThrow(RegistryError);
      await expect(client.getPluginVersions('')).rejects.toThrow(/Package name is required/);
    });
  });

  describe('createRegistryClient', () => {
    it('should create a client with default config', () => {
      const client = createRegistryClient();
      expect(client).toBeInstanceOf(NpmRegistryClient);
    });

    it('should create a client with custom config', () => {
      const client = createRegistryClient({
        registryUrl: 'https://custom.example.com',
        timeout: 15000
      });
      expect(client).toBeInstanceOf(NpmRegistryClient);
    });
  });

  describe('API Method Signatures', () => {
    let client: NpmRegistryClient;

    beforeEach(() => {
      client = new NpmRegistryClient();
    });

    it('should have searchPlugins method', () => {
      expect(typeof client.searchPlugins).toBe('function');
    });

    it('should have getPluginMetadata method', () => {
      expect(typeof client.getPluginMetadata).toBe('function');
    });

    it('should have getPluginVersions method', () => {
      expect(typeof client.getPluginVersions).toBe('function');
    });
  });
});

/**
 * Integration Tests
 *
 * These tests require network access and should be run separately.
 * Uncomment and run manually when needed.
 */

describe.skip('NpmRegistryClient Integration Tests', () => {
  let client: NpmRegistryClient;

  beforeEach(() => {
    client = new NpmRegistryClient({
      timeout: 10000,
      retries: 2
    });
  });

  it('should search for real packages', async () => {
    const results = await client.searchPlugins('react', { size: 5 });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('package');
    expect(results[0].package).toHaveProperty('name');
  }, 15000);

  it('should get metadata for a real package', async () => {
    const metadata = await client.getPluginMetadata('react');

    expect(metadata).toHaveProperty('name', 'react');
    expect(metadata).toHaveProperty('version');
    expect(metadata).toHaveProperty('dist');
    expect(metadata.dist).toHaveProperty('tarball');
  }, 15000);

  it('should get versions for a real package', async () => {
    const versions = await client.getPluginVersions('react');

    expect(versions).toHaveProperty('name', 'react');
    expect(versions).toHaveProperty('versions');
    expect(versions).toHaveProperty('dist-tags');
    expect(versions['dist-tags']).toHaveProperty('latest');
    expect(Object.keys(versions.versions).length).toBeGreaterThan(0);
  }, 15000);

  it('should handle 404 for non-existent package', async () => {
    await expect(
      client.getPluginMetadata('this-package-definitely-does-not-exist-12345')
    ).rejects.toThrow(RegistryError);

    await expect(
      client.getPluginMetadata('this-package-definitely-does-not-exist-12345')
    ).rejects.toThrow(/Package not found/);
  }, 15000);
});
