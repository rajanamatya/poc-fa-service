import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // BFF_API_URL is the frontend-facing endpoint (the BFF API Gateway).
  // Falls back to API_URL for backward compatibility.
  const bffUrl = env.BFF_API_URL || env.API_URL

  const serverConfig = (() => {
    if (!bffUrl) return undefined
    const apiUrl = new URL(bffUrl)
    const stagePath = apiUrl.pathname.replace(/\/$/, '')
    return {
      proxy: {
        '/api': {
          target: apiUrl.origin,
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
