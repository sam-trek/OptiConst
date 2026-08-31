import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/OptiConst/',
  plugins: [svelte()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
