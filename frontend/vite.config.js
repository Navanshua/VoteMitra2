import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Fixes the Cross-Origin-Opener-Policy (COOP) error for Firebase Auth
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },

  // Read .env from the project ROOT (one folder up from frontend/)
  envDir: path.resolve(__dirname, '..'),
})