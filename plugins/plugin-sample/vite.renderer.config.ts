import { defineConfig } from 'vite'

// Builds the renderer entry as a browser ESM module.
// react, react-dom, react/jsx-runtime, and @sessionry/plugin-api are
// externalized — the app's import map (index.html) resolves them to
// the host bundles served at sessionry://host/*.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/renderer.tsx',
      formats: ['es'],
      fileName: () => 'renderer.js'
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@sessionry/plugin-api']
    }
  }
})
