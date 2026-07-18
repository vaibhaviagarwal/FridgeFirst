import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Electron loads the built index.html via file://, so asset paths must be
  // relative ("./assets/...") instead of absolute ("/assets/...") or the
  // packaged app loads a blank screen with no visible error.
  base: "./",
})
