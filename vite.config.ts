import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
    },
  },
  worker: {
    format: "es",
  },
});