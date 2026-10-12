import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: [".e2b.app", "localhost"],
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:5000",
          changeOrigin: false,
        },
        "/health": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:5000",
          changeOrigin: false,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      allowedHosts: [".e2b.app", "localhost"],
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:5000",
          changeOrigin: false,
        },
      },
    },
    build: { chunkSizeWarningLimit: 1800 },
  };
});
