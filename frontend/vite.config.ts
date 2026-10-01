import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Service worker precaches the app shell so the app opens with no connection;
    // reports written offline are queued in IndexedDB and synced on reconnect.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64x64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'CrisisConnect',
        short_name: 'CrisisConnect',
        description: 'Report emergencies and follow live crisis alerts, even when networks go down.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/reports': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/social': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
