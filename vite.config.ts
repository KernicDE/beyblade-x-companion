import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Beyblade X Database',
        short_name: 'BX Database',
        description: 'Community-driven Beyblade X catalog, collection and match database.',
        theme_color: '#3b82f6',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/catalog$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog-api',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
})
