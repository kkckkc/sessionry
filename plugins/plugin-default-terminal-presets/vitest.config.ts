import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@sessionry/components': path.resolve(rootDir, '../../packages/components/src/index.ts'),
      '@sessionry/plugin-api': path.resolve(rootDir, '../../packages/plugin-api/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx']
  }
})
