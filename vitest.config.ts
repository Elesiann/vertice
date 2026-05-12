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
      exclude: ["**/node_modules/**", "**/dist/**", ".claude/worktrees/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/lib/**/*.ts"],
        exclude: ["**/*.test.ts", "**/__tests__/**", "src/test/**"],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  }),
);
