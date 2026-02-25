
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/clipboard/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
});
