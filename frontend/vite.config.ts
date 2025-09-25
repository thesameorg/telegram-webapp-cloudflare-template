import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: true, // Fail if port is busy instead of trying another
    proxy: {
      '/api': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
      '/webhook': 'http://localhost:8787'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})