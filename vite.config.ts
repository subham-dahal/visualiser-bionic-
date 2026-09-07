import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_PORTAL_API_BASE ??
                  env.VITE_PORTAL_API_BASE ??
                  'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
