import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        // Cache cả model, wasm và file giọng nói để chạy offline.
        // CHỈ được ghi "chạy offline" vào hồ sơ sau khi đã thử thật (xem docs/OFFLINE_TEST.md).
        globPatterns: ['**/*.{js,css,html,wasm,task,mp3,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: 'LifeAssist CPR Trainer',
        short_name: 'LifeAssistCPR',
        description: 'AI chest-compression coach that runs on-device',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
