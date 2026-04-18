import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'firebase-app':  ['firebase/app', 'firebase/auth'],
          'firebase-db':   ['firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
        },
      },
    },
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false,
  },
  server: { hmr: { overlay: true } },
});
