import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    name: "global-ignores",
    ignores: [
      "**/node_modules/**",
      "**/coverage/**",
      "**/html/**",
      "**/dist/**",
      "**/build/**",
      "**/public/**",
      "**/vendor/**",
      "**/lib/**",
      "**/logs/**",
      "**/tmp/**",
    ],
  },
  {
    files: ["**/*.{js,mjs}"], // ES Modules
    plugins: { js },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
        suite: "readonly",
      },
      sourceType: "module",
      ecmaVersion: 2022,
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.cjs"], // CommonJS files (explicit .cjs extension)
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
      ecmaVersion: 2022,
    },
  },
]);
