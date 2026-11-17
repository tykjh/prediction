import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep the chart library in one shared chunk. It is used by both the
        // first page and lazily loaded pages, and splitting it between them
        // creates a circular dependency between chunks.
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'api/_tests/**/*.test.js'],
  },
})
