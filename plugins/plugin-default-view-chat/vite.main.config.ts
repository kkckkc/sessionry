import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    ssr: resolve(__dirname, 'src/index.ts'),
    target: 'node18',
    rollupOptions: {
      external: ['@sessionry/plugin-api', 'electron'],
      output: {
        format: 'es',
        entryFileNames: 'main.js',
        chunkFileNames: '[name]-[hash].js'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
