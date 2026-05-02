import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      server: {
        deps: {
          inline: ["pdfjs-dist"],
        },
      },
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/lib/**/*.ts"],
        exclude: ["**/*.test.ts", "**/__tests__/**", "src/test/**", "src/lib/parsers/pdf-text.ts"],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
    resolve: {
      alias: [
        {
          find: /^pdfjs-dist$/,
          replacement: "pdfjs-dist/legacy/build/pdf.mjs",
        },
      ],
    },
  }),
);
