import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Web App Manifest
      manifest: {
        name: 'EpiCalc — Public Health Calculator',
        short_name: 'EpiCalc',
        description: 'Free epidemiology, biostatistics, and environmental health calculator',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // 1. Precache ONLY the app shell (HTML + CSS + icons)
        //    JS chunks are excluded — they use runtime caching below
        globPatterns: ['**/*.{html,css,ico,png,svg,webmanifest}'],

        // 2. Runtime caching for JS chunks (lazy-loaded tab components)
        runtimeCaching: [
          {
            // Same-origin JS chunks (lazy tab components, vendor splits)
            urlPattern: /\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'js-chunks',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Cross-origin JS (CDN / external vendor bundles, if any)
            urlPattern: /^https:\/\/.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vendor-chunks',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // recharts + d3 deps → dedicated vendor chunk
          if (
            id.includes('recharts') ||
            id.includes('d3-') ||
            id.includes('victory')
          ) {
            return 'vendor-recharts';
          }
          // React core → dedicated vendor chunk
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/')
          ) {
            return 'vendor-react';
          }
          // All other node_modules → shared vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
