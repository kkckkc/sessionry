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
          '@sessionry/default-workspace-pane-plugin',
          '@sessionry/terminal-pane-plugin',
          '@sessionry/project-sessions-sidebar-plugin'
        ]
      })
    ],
    resolve: {
      alias: [
        {
          find: '@sessionry/terminal-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/terminal-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/terminal-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/terminal-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/project-sessions-sidebar-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/project-sessions-sidebar-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/project-sessions-sidebar-plugin',
          replacement: path.resolve(rootDir, '../../plugins/project-sessions-sidebar-plugin/src/index.ts')
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
          '@sessionry/default-workspace-pane-plugin',
          '@sessionry/terminal-pane-plugin',
          '@sessionry/project-sessions-sidebar-plugin'
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
          find: '@sessionry/project-sessions-sidebar-plugin',
          replacement: path.resolve(rootDir, '../../plugins/project-sessions-sidebar-plugin/src/index.ts')
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
          find: '@sessionry/terminal-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/terminal-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/terminal-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/terminal-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/default-workspace-pane-plugin',
          replacement: path.resolve(rootDir, '../../plugins/default-workspace-pane-plugin/src/index.ts')
        },
        {
          find: '@sessionry/project-sessions-sidebar-plugin/renderer',
          replacement: path.resolve(rootDir, '../../plugins/project-sessions-sidebar-plugin/src/renderer.tsx')
        },
        {
          find: '@sessionry/project-sessions-sidebar-plugin',
          replacement: path.resolve(rootDir, '../../plugins/project-sessions-sidebar-plugin/src/index.ts')
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
