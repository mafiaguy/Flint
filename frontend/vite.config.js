import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/flint/',  // matches your GitHub Pages path
  build: {
    outDir: 'dist',
  },
});