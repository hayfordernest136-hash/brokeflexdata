import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://brokeflexdata-backend.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      '@': `${__dirname}/src`
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: `${__dirname}/index.html`,
        admin: `${__dirname}/admin.html`,
      },
    },
  },
})
