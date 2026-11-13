import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const apiProxy = {
  target: "http://127.0.0.1:8000",
  changeOrigin: true,
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Cloudflare quick tunnels and similar shareable hosts
    allowedHosts: true,
    proxy: {
      "/health": apiProxy,
      "/auth": apiProxy,
      "/me": apiProxy,
      "/users": apiProxy,
      "/couples": apiProxy,
      "/events": apiProxy,
      "/visits": apiProxy,
      "/check-ins": apiProxy,
      "/memories": apiProxy,
      "/presence": apiProxy,
      "/ai": apiProxy,
      "/ws": { ...apiProxy, ws: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/testSetup.ts",
    globals: true,
    exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**"],
  },
})

