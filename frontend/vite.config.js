// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // CRITICAL: This sets the base path so assets load from /flint/ not /
  // Without this, GitHub Pages will 404 on every JS/CSS file
  base: process.env.VITE_BASE || '/flint/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy deps into separate chunks loaded on demand
          'pdf-renderer': ['@react-pdf/renderer'],
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
});
