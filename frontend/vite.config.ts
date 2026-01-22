import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
export default defineConfig({
  plugins: [react()],
  root: "./",
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 5174,
    // Garante que o servidor Vite seja acessível pela rede Docker.
    host: true,
    watch: {
      // Ativa o polling, que é crucial para o hot-reload funcionar
      // de forma confiável dentro do Docker no Windows/Mac.
      usePolling: true,
    },
    // Adiciona a configuração de proxy
    proxy: {
      // Qualquer requisição que comece com /api
      '/api': {
        // será redirecionada para o nosso backend Django
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://backend:8000',
        changeOrigin: true,
      }
    }
  },
});
