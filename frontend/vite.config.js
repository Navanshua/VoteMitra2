import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import webfontDownload from 'vite-plugin-webfont-dl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Downloads Google Fonts at build time and serves them as local assets.
    // This eliminates the render-blocking external font CSS chain entirely:
    //   Before: HTML → fonts.googleapis.com CSS → fonts.gstatic.com woff2 (serial, ~900ms)
    //   After:  HTML → local font CSS (inline) → local woff2 (parallel, ~0ms extra)
    webfontDownload([
      'https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap',
    ], {
      injectAsStyleTag: false, // emit as a separate CSS file so nginx can cache it
      minifyCss: true,
      embedFonts: false,        // keep woff2 as separate files for caching
    }),
  ],

  build: {
    // Enable CSS code-splitting so critical CSS loads separately from JS
    cssCodeSplit: true,

    rollupOptions: {
      output: {
        // Split vendor chunks for better long-term caching:
        // React/ReactDOM, Firebase, and app code are cached independently
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },

  // Fixes the Cross-Origin-Opener-Policy (COOP) error for Firebase Auth
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
