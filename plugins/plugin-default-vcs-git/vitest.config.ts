import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@sessionry/plugin-api',
        replacement: path.resolve(rootDir, '../../packages/plugin-api/src/index.ts')
      }
    ]
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts']
  }
})
