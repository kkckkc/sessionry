import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
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
    setupFiles: './src/renderer/src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
})
