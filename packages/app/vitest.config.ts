import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@sessionry/plugin-default-view-terminal/renderer',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-terminal/src/renderer.tsx')
      },
      {
        find: '@sessionry/plugin-default-view-terminal',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-terminal/src/index.ts')
      },
      {
        find: '@sessionry/plugin-default-view-workspace/renderer',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-workspace/src/renderer.tsx')
      },
      {
        find: '@sessionry/plugin-default-view-workspace',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-workspace/src/index.ts')
      },
      {
        find: '@sessionry/plugin-default-view-left-sidebar/renderer',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-left-sidebar/src/renderer.tsx')
      },
      {
        find: '@sessionry/plugin-default-view-left-sidebar',
        replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-left-sidebar/src/index.ts')
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
    setupFiles: './src/renderer/src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
})
