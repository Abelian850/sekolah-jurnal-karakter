// ESLint flat config (ESLint 9+), berlaku untuk seluruh workspace.
// apps/web menambah aturan next/core-web-vitals lewat next.config bawaan `next lint`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // *.config.js CommonJS (postcss dll.) memicu no-undef 'module' pada flat
    // config — file konfigurasi tooling tidak perlu dilint.
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.open-next/**",
      "**/.wrangler/**",
      "**/node_modules/**",
      "drizzle/**",
      "**/*.config.js",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
