import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// A relative import, so the config bundler inlines it (workspace packages are TypeScript source).
import { APP_NAME } from '../../packages/core/src/config';

// Manifest colours can't use CSS variables. These match --color-ground in tokens.css.
const GROUND = '#F1F2EE';

export default defineConfig({
  plugins: [
    react(),
    {
      // The app name lives in one constant; index.html gets it from there too.
      name: 'app-name',
      transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Quick capture and an Eisenhower matrix, built for ADHD brains.',
        lang: 'en-AU',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: GROUND,
        theme_color: GROUND,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The whole app shell is cached, so it opens and captures with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  // End-to-end specs in e2e/ belong to Playwright, not Vitest.
  test: { include: ['src/**/*.test.ts'] },
});
