import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // This solves the browser→Elasticsearch problem:
      // browser calls /es/... → Vite server forwards to elasticsearch:9200
      '/es': {
        target: process.env.VITE_ES_BASE ?? 'http://elasticsearch:9200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/es/, '')
      }
    }
  }
})