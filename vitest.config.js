import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/routes/*.e2e.test.js"],
    exclude: ["node_modules", "test/helper.js", "coverage"],
    testTimeout: 30000,
    hookTimeout: 30000,
    threads: false,
    isolate: false,
    coverage: {
      provider: "v8",
      enabled: true,
      reporter: ["text", "html", "json", "lcov", "clover"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.js", "src/*.js", "db.js", "schema.js"],
      exclude: [
        "node_modules/**",
        "test/**",
        "coverage/**",
        "**/*.config.js",
        "src/services/rateLimiting.js",
        "src/services/authMiddleware.js",
        "src/services/seed.js",
      ],
      all: true,
      clean: true,
      cleanOnRerun: true,
      sourceMap: true,
      // Disable thresholds for now, we'll enable after reaching 95%
      thresholds: false,
      // Show more details
      watermarks: {
        statements: [95, 100],
        functions: [95, 100],
        branches: [90, 100],
        lines: [95, 100],
      },
    },
    server: {
      sourcemap: true,
    },
  },
});
