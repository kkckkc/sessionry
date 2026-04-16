import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@renderer': path.resolve(rootDir, 'src/renderer/src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/renderer/src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
})
