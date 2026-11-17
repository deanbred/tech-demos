import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'
import { tracesApiPlugin } from './src/server/traces-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tracesApiPlugin(path.resolve(__dirname, 'traces'))],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
