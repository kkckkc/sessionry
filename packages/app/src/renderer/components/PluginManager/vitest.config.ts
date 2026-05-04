/**
 * Vitest Configuration for Plugin Manager Components
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test-setup.ts',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@sessionry/components': path.resolve(__dirname, '../../../../../components/src'),
      '@sessionry/design-tokens': path.resolve(__dirname, '../../../../../design-tokens/src')
    }
  }
})
