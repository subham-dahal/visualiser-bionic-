import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function injectCssIntoJs(): Plugin {
  return {
    name: 'inject-css-into-js',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const css = Object.entries(bundle)
        .filter(([, item]) => item.type === 'asset' && item.fileName.endsWith('.css'))
        .map(([fileName, item]) => {
          delete bundle[fileName]
          const source = (item as { source: string | Uint8Array }).source
          return typeof source === 'string' ? source : new TextDecoder().decode(source)
        })
        .join('\n')
      if (!css) return
      const inject = `\n(function(){try{var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s)}catch(e){}})();`
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.isEntry) item.code += inject
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), injectCssIntoJs()],
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
      cssMinify: true,
      cssCodeSplit: false,
      lib: {
        entry: resolve(import.meta.dirname, 'src/index.ts'),
        name: 'FitVisualiser',
        fileName: 'fit-visualiser',
        formats: ['es', 'cjs']
      },
      rollupOptions: {
        external: [/^react($|\/)/, /^react-dom($|\/)/, 'three'],
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
