import { resolve } from 'path'
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
    build: {
      lib: {
        entry: resolve(import.meta.dirname, 'src/index.ts'),
        name: 'FitVisualiser',
        fileName: 'fit-visualiser',
        formats: ['es', 'cjs']
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'three'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            three: 'THREE'
          }
        }
      }
    }
  }
})
