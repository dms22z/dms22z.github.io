import "dotenv/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT_SERVEUR = Number(process.env.PORT_SERVEUR ?? 3210);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/api": `http://127.0.0.1:${PORT_SERVEUR}`,
      "/fichiers": `http://127.0.0.1:${PORT_SERVEUR}`,
    },
  },
});
