import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../", // Load .env from root directory
  server: {
    port: 3000,
    host: true,
    strictPort: true, // Fail if port is busy instead of trying another
    allowedHosts: ["*.ngrok-free.app", "*.trycloudflare.com"],
    proxy: {
      "/api": "http://localhost:8787",
      "/health": "http://localhost:8787",
      "/webhook": "http://localhost:8787",
      "/r2": "http://localhost:8787",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
