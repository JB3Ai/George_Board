
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/os3grid/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
});
