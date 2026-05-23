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

/**
 * Inlines the main CSS bundle into index.html and removes the `<link
 * rel="stylesheet">`. Tailwind 4 emits a single ~12kB-gzip stylesheet, which
 * currently render-blocks every route for ~155ms on mobile (Lighthouse). At
 * that size, inlining wins: HTML grows ~12kB on the wire but one critical
 * round-trip disappears from FCP/LCP. The prerender step then bakes the
 * inline `<style>` into each per-route HTML, so cold visits to /, /cards/*,
 * etc. all benefit.
 */
const inlineCss = (): Plugin => ({
  name: "inline-main-css",
  apply: "build",
  enforce: "post",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      const bundle = ctx.bundle;
      if (!bundle) return html;
      const cssAsset = Object.values(bundle).find(
        (chunk): chunk is typeof chunk & { type: "asset"; source: string | Uint8Array } =>
          chunk.type === "asset" && chunk.fileName.endsWith(".css"),
      );
      if (!cssAsset) return html;
      const css =
        typeof cssAsset.source === "string"
          ? cssAsset.source
          : Buffer.from(cssAsset.source).toString("utf8");
      const linkRe = new RegExp(
        `\\s*<link[^>]*href="[^"]*${cssAsset.fileName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"[^>]*>`,
        "g",
      );
      return html.replace(linkRe, "").replace("</head>", `<style>${css}</style></head>`);
    },
  },
});

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
    inlineCss(),
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
            bundleSizeOptimizations: {
              excludeDebugStatements: true,
              excludeReplayIframe: true,
              excludeReplayShadowDom: true,
              excludeReplayWorker: true,
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
  define: {
    __SENTRY_DEBUG__: JSON.stringify(false),
    __RRWEB_EXCLUDE_IFRAME__: JSON.stringify(true),
    __RRWEB_EXCLUDE_SHADOW_DOM__: JSON.stringify(true),
    __SENTRY_EXCLUDE_REPLAY_WORKER__: JSON.stringify(true),
  },
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
