import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
}

export default defineConfig({
  plugins: [vue()],
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: { alias },
        test: {
          name: 'app',
          include: ['tests/src/**/*.test.ts'],
          environment: 'jsdom',
          globals: true,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'functions',
          include: ['tests/functions/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
      },
    ],
  },
})
