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
      "**/test/**",
    ],
  },
  {
    files: ["**/*.{js,mjs}"], // ES Modules
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: "module",
      ecmaVersion: 2022,
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
