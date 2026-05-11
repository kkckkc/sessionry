import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/renderer.tsx'),
      formats: ['es'],
      fileName: () => 'renderer.js'
    },
    rollupOptions: {
      external: ['@sessionry/plugin-api', 'react', 'react-dom', 'react/jsx-runtime']
    },
    outDir: 'dist',
    emptyOutDir: false
  }
});
