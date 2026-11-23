import path from "path"
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: process.env.CONTAINER_DEV === 'true' ? '0.0.0.0' : 'localhost',
    port: 5173,
    strictPort: true,
    watch: { usePolling: process.env.CONTAINER_DEV === 'true' },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
})
