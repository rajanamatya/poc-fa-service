import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const serverConfig = (() => {
    if (!env.API_URL) return undefined
    const apiUrl = new URL(env.API_URL)
    const stagePath = apiUrl.pathname.replace(/\/$/, '') // e.g. /V1
    return {
      proxy: {
        '/api': {
          target: apiUrl.origin, // scheme + host only — http-proxy drops target path
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, stagePath),
        },
      },
    }
  })()

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: serverConfig,
  }
})
