import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const hostDir = path.resolve(rootDir, 'src/host')
const S = path.sep

/**
 * Vite plugin that rewrites `export * from '<pkg>'` in the host wrapper files
 * into explicit named exports by inspecting the actual CJS module at build time.
 * This sidesteps the limitation where Rollup's commonjs plugin can't statically
 * detect named exports from `module.exports = require(...)` patterns.
 */
function cjsNamedExports(): Plugin {
  return {
    name: 'cjs-named-exports',
    transform(code, id) {
      if (!id.startsWith(hostDir)) return null
      const match = code.match(/^export \* from ['"]([^'"]+)['"]/m)
      if (!match) return null
      const pkg = match[1]
      try {
        const mod = require(pkg)
        const names = Object.keys(mod).filter(k => k !== 'default' && k !== '__esModule')
        if (names.length === 0) return null
        return code.replace(
          match[0],
          `import __mod from '${pkg}';\n` +
          names.map(n => `export const ${n} = __mod.${n};`).join('\n')
        )
      } catch {
        return null
      }
    }
  }
}

// Builds standalone ESM bundles for host-provided shared libraries.
// These are served via the sessionry://host/ protocol so external plugins
// can import react, react-dom, and @sessionry/plugin-api without bundling
// their own copies.
//
// Each entry uses a thin wrapper (src/host/*.ts) that re-exports from the
// npm package. The cjsNamedExports plugin detects CJS named exports at build
// time so `export *` produces real named ESM exports.
export default defineConfig({
  plugins: [cjsNamedExports()],
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
        react: path.resolve(rootDir, 'src/host/react.ts'),
        'react-dom': path.resolve(rootDir, 'src/host/react-dom.ts'),
        'react-dom-client': path.resolve(rootDir, 'src/host/react-dom-client.ts'),
        'react-jsx-runtime': path.resolve(rootDir, 'src/host/react-jsx-runtime.ts'),
        'plugin-api': path.resolve(rootDir, 'src/host/plugin-api.ts')
      },
      preserveEntrySignatures: 'exports-only',
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      },
      external(id, importer) {
        if (!importer) return false
        // Wrapper files (src/host/*.ts) must bundle their direct target package
        if (importer.startsWith(hostDir + S)) return false
        // Beyond the wrappers, externalize react and react-dom across bundles
        // so they share a single instance via the import map.
        if (id === 'react') {
          return !importer.includes(`${S}node_modules${S}react${S}`)
        }
        if (id === 'react-dom' || id === 'react-dom/client' || id.startsWith('react-dom/')) {
          return !importer.includes(`${S}node_modules${S}react-dom${S}`)
        }
        return false
      }
    }
  }
})
