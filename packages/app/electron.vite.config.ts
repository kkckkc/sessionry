import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@sessionry/plugin-api',
          '@sessionry/plugin-default-view-workspace',
          '@sessionry/plugin-default-view-terminal',
          '@sessionry/plugin-default-view-left-sidebar'
        ]
      })
    ],
    resolve: {
      alias: [
        {
          find: '@sessionry/components/style.css',
          replacement: path.resolve(rootDir, '../components/src/style.css')
        },
        {
          find: '@sessionry/components',
          replacement: path.resolve(rootDir, '../components/src/index.ts')
        },
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
          find: '@app-shared',
          replacement: path.resolve(rootDir, 'src/shared')
        }
      ]
    }
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@sessionry/plugin-api',
          '@sessionry/plugin-default-view-workspace',
          '@sessionry/plugin-default-view-terminal',
          '@sessionry/plugin-default-view-left-sidebar'
        ]
      })
    ],
    resolve: {
      alias: [
        {
          find: '@sessionry/plugin-api',
          replacement: path.resolve(rootDir, '../plugin-api/src/index.ts')
        },
        {
          find: '@sessionry/plugin-default-view-left-sidebar',
          replacement: path.resolve(rootDir, '../../plugins/plugin-default-view-left-sidebar/src/index.ts')
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
    // In production, React and plugin-api are served as host bundles via the
    // sessionry:// protocol and resolved by the import map in index.html.
    // This ensures all plugins share the same module instances as the host app.
    // In dev, Vite handles React normally; external plugins loaded in dev will
    // use the pre-built sessionry://host/react.js and get a separate instance
    // (acceptable limitation — production uses the import map for full sharing).
    build: {
      rollupOptions: {
        external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', '@sessionry/plugin-api']
      }
    },
    resolve: {
      alias: [
        {
          find: '@sessionry/components/style.css',
          replacement: path.resolve(rootDir, '../components/src/style.css')
        },
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
      setupFiles: path.resolve(rootDir, 'src/renderer/src/test/setup.ts')
    }
  }
})
