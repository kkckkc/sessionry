import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Resolve package entries directly so we don't need TypeScript wrapper files
// for packages that use the legacy `export =` CJS style (e.g. @types/react).
const reactEntry = require.resolve('react')
const reactDomEntry = require.resolve('react-dom')
const reactJsxEntry = require.resolve('react/jsx-runtime')

// Builds standalone ESM bundles for host-provided shared libraries.
// These are served via the sessionry://host/ protocol so external plugins
// can import react, react-dom, and @sessionry/plugin-api without bundling
// their own copies.
//
// React is fully bundled into react.js (self-contained).
// react-dom, react-jsx-runtime, and plugin-api have React externalized —
// they import it as a bare specifier resolved by the renderer's import map.
export default defineConfig({
  resolve: {
    alias: {
      '@sessionry/plugin-api': path.resolve(rootDir, '../plugin-api/src/index.ts')
    }
  },
  build: {
    outDir: path.resolve(rootDir, 'out/host'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        react: reactEntry,
        'react-dom': reactDomEntry,
        'react-jsx-runtime': reactJsxEntry,
        'plugin-api': path.resolve(rootDir, 'src/host/plugin-api.ts')
      },
      // Keep all exports even when no consumer is visible in this build —
      // these bundles are loaded at runtime by external plugins.
      preserveEntrySignatures: 'exports-only',
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      },
      // Each host entry bundles its own package fully but externalizes sibling
      // React packages, so all bundles share module instances via the import map.
      // We check whether the importer is within the same package to decide.
      external: (id, importer) => {
        if (!importer) return false
        const inReactPkg = importer.includes(`${path.sep}node_modules${path.sep}react${path.sep}`) ||
                           importer.includes(`${path.sep}node_modules${path.sep}react-dom${path.sep}`) ||
                           importer.includes(`${path.sep}node_modules${path.sep}scheduler${path.sep}`)
        if (id === 'react') {
          // Externalize 'react' everywhere except inside React's own package.
          return !inReactPkg
        }
        if (id === 'react-dom' || id.startsWith('react-dom/')) {
          // Externalize 'react-dom' imports except when react-dom is importing itself internally.
          return !importer.includes(`${path.sep}node_modules${path.sep}react-dom${path.sep}`)
        }
        if (id === 'react/jsx-runtime') {
          return !inReactPkg
        }
        return false
      }
    }
  }
})
