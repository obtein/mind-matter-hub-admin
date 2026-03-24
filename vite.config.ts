import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  clearScreen: false,
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
