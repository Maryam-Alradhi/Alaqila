import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'العقيلة | متجر المجوهرات',
        short_name: 'العقيلة',
        description: 'أفخم الخواتم والإكسسوارات المختارة بعناية — نوصل لكل البحرين',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0f1a',
        theme_color: '#0b0f1a',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // ✅ الفيديوهات كبيرة — نخليها تُجلب من الشبكة عادي بدل ما تدخل الكاش وتكبّر حجمه
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2}'],
      },
    }),
  ],
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
