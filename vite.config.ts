import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('firebase/firestore')) return 'firebase-db';
          if (id.includes('firebase/storage')) return 'firebase-storage';
          if (id.includes('firebase/app') || id.includes('firebase/auth')) return 'firebase-app';
          if (id.includes('react-router-dom') || id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
    minify: 'oxc',
    target: 'esnext',
    sourcemap: false,
  },
  server: { hmr: { overlay: true } },
});
