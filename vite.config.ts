import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const shouldUploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);
const shouldEmitSourcemaps = shouldUploadSourcemaps || process.env.VITE_BUILD_SOURCEMAP === "true";

// Stamp the build with a release identifier. Priority:
// 1. Explicit VITE_APP_VERSION (CI / manual override).
// 2. Cloudflare Pages commit SHA (set automatically on Pages builds).
// 3. Local "dev" fallback so the variable is always defined.
const appVersion = process.env.VITE_APP_VERSION ?? process.env.CF_PAGES_COMMIT_SHA ?? "dev";
process.env.VITE_APP_VERSION = appVersion;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG ?? "vertice",
            project: process.env.SENTRY_PROJECT ?? "vertice",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: appVersion },
            sourcemaps: {
              filesToDeleteAfterUpload: ["*.js.map"],
            },
          }),
        ]
      : []),
    ...(process.env.ANALYZE === "true"
      ? [
          visualizer({
            filename: "dist/stats.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
            open: false,
          }) as Plugin,
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
    },
  },
  build: {
    sourcemap: shouldEmitSourcemaps ? "hidden" : false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              priority: 40,
              test: /node_modules[\\/](?:\.pnpm[\\/])?(?:react|react-dom|react-router|react-router-dom)(?:@|[\\/])/,
            },
            {
              name: "vendor-sentry",
              priority: 35,
              test: /node_modules[\\/](?:\.pnpm[\\/])?@sentry(?:\+|[\\/])/,
            },
            {
              name: "vendor-motion",
              priority: 30,
              test: /node_modules[\\/](?:\.pnpm[\\/])?framer-motion(?:@|[\\/])/,
            },
            {
              name: "vendor-zod",
              priority: 26,
              test: /node_modules[\\/](?:\.pnpm[\\/])?zod(?:@|[\\/])/,
            },
            {
              name: "vendor-form",
              priority: 25,
              test: /node_modules[\\/](?:\.pnpm[\\/])?react-hook-form(?:@|[\\/])/,
            },
            {
              name: "vendor-form",
              priority: 24,
              test: /node_modules[\\/](?:\.pnpm[\\/])?@hookform(?:\+|[\\/])/,
            },
            {
              name: "vendor-icons",
              priority: 20,
              test: /node_modules[\\/](?:\.pnpm[\\/])?lucide-react(?:@|[\\/])/,
            },
          ],
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
