/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
