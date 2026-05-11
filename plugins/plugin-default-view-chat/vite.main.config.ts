import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: ['@sessionry/plugin-api', 'electron']
    },
    outDir: 'dist',
    emptyOutDir: false
  }
});
