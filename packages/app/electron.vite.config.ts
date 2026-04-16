import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@sessionry/plugin-api', '@sessionry/default-workspace-pane-plugin'] })],
    resolve: {
      alias: [
        {
          find: '@sessionry/default-workspace-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/plugin-api',
          replacement: path.resolve(rootDir, '../plugin-api/src/index.ts')
        },
        {
          find: '@app-shared',
          replacement: path.resolve(rootDir, 'src/shared')
        }
      ]
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@sessionry/plugin-api', '@sessionry/default-workspace-pane-plugin'] })],
    resolve: {
      alias: [
        {
          find: '@sessionry/plugin-api',
          replacement: path.resolve(rootDir, '../plugin-api/src/index.ts')
        },
        {
          find: '@app-shared',
          replacement: path.resolve(rootDir, 'src/shared')
        }
      ]
    }
  },
  renderer: {
    root: path.resolve(rootDir, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: '@sessionry/default-workspace-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/plugin-api',
          replacement: path.resolve(rootDir, '../plugin-api/src/index.ts')
        },
        {
          find: '@app-renderer',
          replacement: path.resolve(rootDir, 'src/renderer/src')
        },
        {
          find: '@app-shared',
          replacement: path.resolve(rootDir, 'src/shared')
        }
      ]
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: path.resolve(rootDir, 'src/renderer/src/test/setup.ts')
    }
  }
})
