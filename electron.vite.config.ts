import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': path.resolve(rootDir, 'src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': path.resolve(rootDir, 'src/shared')
      }
    }
  },
  renderer: {
    root: path.resolve(rootDir, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(rootDir, 'src/shared'),
        '@renderer': path.resolve(rootDir, 'src/renderer/src')
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: path.resolve(rootDir, 'src/renderer/src/test/setup.ts')
    }
  }
})
