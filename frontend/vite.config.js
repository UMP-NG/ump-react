import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/ump-icon.svg', 'images/ump-banner.svg', 'images/market.png', 'images/hostel-hub.png'],
      manifest: {
        name: 'UMP – University Marketplace',
        short_name: 'UMP',
        description: 'The student marketplace for UNILAG — buy, sell, rent, and discover.',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['shopping', 'education'],
        icons: [
          {
            src: 'images/ump-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: 'images/ump-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Marketplace',
            short_name: 'Market',
            url: '/market',
            icons: [{ src: 'images/market.png', sizes: '96x96' }],
          },
          {
            name: 'My Orders',
            short_name: 'Orders',
            url: '/orders',
            icons: [{ src: 'images/ump-icon.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
          {
            name: 'Hostels',
            short_name: 'Hostels',
            url: '/hostel',
            icons: [{ src: 'images/hostel-hub.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        // Only precache code assets — large images are served via runtime caching
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Local static images (public/images/*)
            urlPattern: /\/images\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'local-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Font Awesome CDN
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cloudinary images — stale-while-revalidate
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Browse endpoints — serve cached immediately, revalidate in background (60s TTL)
            urlPattern: /\/api\/(products|categories|listings|services|sellers)\b/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-browse',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Transactional / auth endpoints — always fresh, never serve stale
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Keep SW disabled in dev to avoid confusing cache behaviour
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
