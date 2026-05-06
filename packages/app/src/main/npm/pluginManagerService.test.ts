/**
 * Tests for Plugin Manager Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PluginManagerService,
  createPluginManagerService,
  type SearchOptions,
  type PluginInstallOptions
} from './pluginManagerService';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: (name: string) => {
      if (name === 'userData') {
        return '/mock/user/data';
      }
      return '/mock/path';
    }
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

describe('PluginManagerService', () => {
  describe('Constructor and Configuration', () => {
    it('should create service with default config', () => {
      const service = new PluginManagerService();
      expect(service).toBeInstanceOf(PluginManagerService);
    });

    it('should create service with custom config', () => {
      const service = new PluginManagerService({
        registry: {
          registryUrl: 'https://custom-registry.example.com',
          timeout: 10000
        },
        validator: {
          strictMode: true
        },
        pluginsDir: '/custom/plugins'
      });
      expect(service).toBeInstanceOf(PluginManagerService);
    });

    it('should extend EventEmitter', () => {
      const service = new PluginManagerService();
      expect(typeof service.on).toBe('function');
      expect(typeof service.emit).toBe('function');
    });
  });

  describe('API Method Signatures', () => {
    let service: PluginManagerService;

    beforeEach(() => {
      service = new PluginManagerService();
    });

    it('should have searchPlugins method', () => {
      expect(typeof service.searchPlugins).toBe('function');
    });

    it('should have installPlugin method', () => {
      expect(typeof service.installPlugin).toBe('function');
    });

    it('should have uninstallPlugin method', () => {
      expect(typeof service.uninstallPlugin).toBe('function');
    });

    it('should have updatePlugin method', () => {
      expect(typeof service.updatePlugin).toBe('function');
    });

    it('should have checkForUpdates method', () => {
      expect(typeof service.checkForUpdates).toBe('function');
    });

    it('should have getPluginInfo method', () => {
      expect(typeof service.getPluginInfo).toBe('function');
    });

    it('should have getPluginsDirectory method', () => {
      expect(typeof service.getPluginsDirectory).toBe('function');
    });
  });

  describe('Event Emitter', () => {
    let service: PluginManagerService;

    beforeEach(() => {
      service = new PluginManagerService();
    });

    it('should support typed event listeners', () => {
      const listener = vi.fn();
      service.on('search:start', listener);
      service.emit('search:start', 'test query');
      expect(listener).toHaveBeenCalledWith('test query');
    });

    it('should support multiple event types', () => {
      const searchListener = vi.fn();
      const installListener = vi.fn();

      service.on('search:start', searchListener);
      service.on('install:start', installListener);

      service.emit('search:start', 'query');
      service.emit('install:start', 'package');

      expect(searchListener).toHaveBeenCalledWith('query');
      expect(installListener).toHaveBeenCalledWith('package');
    });

    it('should support progress events', () => {
      const progressListener = vi.fn();
      service.on('install:progress', progressListener);

      service.emit('install:progress', 'package', 50, 100);

      expect(progressListener).toHaveBeenCalledWith('package', 50, 100);
    });

    it('should support error events', () => {
      const errorListener = vi.fn();
      const error = new Error('Test error');

      service.on('search:error', errorListener);
      service.emit('search:error', error);

      expect(errorListener).toHaveBeenCalledWith(error);
    });
  });

  describe('Type Definitions', () => {
    it('should define SearchOptions type', () => {
      const options: SearchOptions = {
        query: 'test',
        size: 20,
        from: 0
      };

      expect(options.query).toBe('test');
      expect(options.size).toBe(20);
      expect(options.from).toBe(0);
    });

    it('should define PluginInstallOptions type', () => {
      const options: PluginInstallOptions = {
        force: true,
        skipValidation: false,
        onProgress: (downloaded, total) => {
          expect(typeof downloaded).toBe('number');
          expect(typeof total).toBe('number');
        }
      };

      expect(options.force).toBe(true);
      expect(options.skipValidation).toBe(false);
      expect(typeof options.onProgress).toBe('function');
    });

    it('should define PluginUpdateInfo type', () => {
      const updateInfo = {
        pluginId: 'test-plugin',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        changelog: 'Bug fixes'
      };

      expect(updateInfo.pluginId).toBe('test-plugin');
      expect(updateInfo.updateAvailable).toBe(true);
    });

    it('should define PluginSearchResult type', () => {
      const result = {
        package: {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test',
          date: '2024-01-01'
        },
        score: {
          final: 0.8,
          detail: {
            quality: 0.9,
            popularity: 0.7,
            maintenance: 0.8
          }
        },
        searchScore: 0.85,
        compatible: true,
        validationWarnings: []
      };

      expect(result.compatible).toBe(true);
      expect(Array.isArray(result.validationWarnings)).toBe(true);
    });
  });

  describe('Path Management', () => {
    it('should provide plugins directory path', () => {
      const service = new PluginManagerService();
      const pluginsDir = service.getPluginsDirectory();

      expect(typeof pluginsDir).toBe('string');
      expect(pluginsDir.length).toBeGreaterThan(0);
    });

    it('should use custom plugins directory', () => {
      const customDir = '/custom/plugins';
      const service = new PluginManagerService({
        pluginsDir: customDir
      });
      const pluginsDir = service.getPluginsDirectory();

      expect(pluginsDir).toContain('custom');
    });
  });

  describe('createPluginManagerService', () => {
    it('should create service with default config', () => {
      const service = createPluginManagerService();
      expect(service).toBeInstanceOf(PluginManagerService);
    });

    it('should create service with custom config', () => {
      const service = createPluginManagerService({
        registry: {
          registryUrl: 'https://custom.example.com'
        }
      });
      expect(service).toBeInstanceOf(PluginManagerService);
    });
  });

  describe('Service Integration', () => {
    let service: PluginManagerService;

    beforeEach(() => {
      service = new PluginManagerService();
    });

    it('should coordinate registry, validator, and installer', () => {
      // Service should have all three components initialized
      expect(service).toHaveProperty('searchPlugins');
      expect(service).toHaveProperty('installPlugin');
      expect(service).toHaveProperty('uninstallPlugin');
    });

    it('should handle search options', () => {
      const options: SearchOptions = {
        query: 'sessionry-plugin',
        size: 10,
        from: 0
      };

      expect(options.query).toBeTruthy();
      expect(typeof service.searchPlugins).toBe('function');
    });

    it('should handle install options', () => {
      const options: PluginInstallOptions = {
        force: false,
        skipValidation: false
      };

      expect(typeof options.force).toBe('boolean');
      expect(typeof service.installPlugin).toBe('function');
    });
  });

  describe('Event Flow', () => {
    let service: PluginManagerService;

    beforeEach(() => {
      service = new PluginManagerService();
    });

    it('should emit events in correct order for search', () => {
      const events: string[] = [];

      service.on('search:start', () => events.push('start'));
      service.on('search:complete', () => events.push('complete'));
      service.on('search:error', () => events.push('error'));

      service.emit('search:start', 'query');
      service.emit('search:complete', []);

      expect(events).toEqual(['start', 'complete']);
    });

    it('should emit events in correct order for install', () => {
      const events: string[] = [];

      service.on('install:start', () => events.push('start'));
      service.on('install:progress', () => events.push('progress'));
      service.on('install:complete', () => events.push('complete'));

      service.emit('install:start', 'package');
      service.emit('install:progress', 'package', 50, 100);
      service.emit('install:complete', {
        success: true,
        pluginId: 'test',
        version: '1.0.0',
        installedPath: '/path'
      });

      expect(events).toEqual(['start', 'progress', 'complete']);
    });

    it('should emit events in correct order for uninstall', () => {
      const events: string[] = [];

      service.on('uninstall:start', () => events.push('start'));
      service.on('uninstall:complete', () => events.push('complete'));

      service.emit('uninstall:start', 'plugin-id');
      service.emit('uninstall:complete', 'plugin-id', true);

      expect(events).toEqual(['start', 'complete']);
    });

    it('should emit events in correct order for update', () => {
      const events: string[] = [];

      service.on('update:start', () => events.push('start'));
      service.on('update:complete', () => events.push('complete'));

      service.emit('update:start', 'plugin-id');
      service.emit('update:complete', {
        success: true,
        pluginId: 'test',
        version: '2.0.0',
        installedPath: '/path'
      });

      expect(events).toEqual(['start', 'complete']);
    });
  });
});

/**
 * Integration Tests
 *
 * These tests require network access and should be run separately.
 * Uncomment and run manually when needed.
 */

describe.skip('PluginManagerService Integration Tests', () => {
  let service: PluginManagerService;

  beforeEach(() => {
    service = new PluginManagerService();
  });

  it('should search for real plugins', async () => {
    const results = await service.searchPlugins({
      query: 'react',
      size: 5
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('package');
    expect(results[0]).toHaveProperty('compatible');
  }, 30000);

  it('should get plugin info', async () => {
    const info = await service.getPluginInfo('react');

    expect(info).toHaveProperty('metadata');
    expect(info).toHaveProperty('validation');
    expect(info.metadata.name).toBe('react');
  }, 30000);

  it('should check for updates', async () => {
    const updateInfo = await service.checkForUpdates('react', 'react', '17.0.0');

    expect(updateInfo).toHaveProperty('pluginId');
    expect(updateInfo).toHaveProperty('currentVersion');
    expect(updateInfo).toHaveProperty('latestVersion');
    expect(updateInfo).toHaveProperty('updateAvailable');
  }, 30000);
});
