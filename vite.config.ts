import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    // The 3D 540-view simulator is lazy-loaded and intentionally larger than
    // normal UI chunks because it contains three.js + react-three-fiber.
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react()],
})
