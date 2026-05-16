import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      // Don't crawl into sibling git worktrees (each has its own node_modules and a
      // duplicate `src/` tree) — vitest's default glob would otherwise pick them up.
      exclude: ["**/node_modules/**", "**/dist/**", ".claude/worktrees/**", "e2e/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: [
          "src/components/ui/**/*.{ts,tsx}",
          "src/context/**/*.{ts,tsx}",
          "src/features/input/**/*.{ts,tsx}",
          "src/features/results/**/*.{ts,tsx}",
          "src/hooks/**/*.{ts,tsx}",
          "src/lib/**/*.{ts,tsx}",
          "src/pages/**/*.{ts,tsx}",
        ],
        exclude: ["**/*.test.ts", "**/__tests__/**", "src/test/**"],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 79,
          statements: 80,
        },
      },
    },
  }),
);
