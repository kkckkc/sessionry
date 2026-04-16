import { defineConfig } from 'vite'

// Builds the main-process entry as a Node.js ESM module.
// All bare specifiers are externalized — the Node runtime resolves them.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'main.js'
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !id.startsWith('/')
    }
  }
})
