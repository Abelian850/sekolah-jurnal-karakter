// ESLint flat config (ESLint 9+), berlaku untuk seluruh workspace.
// apps/web menambah aturan next/core-web-vitals lewat next.config bawaan `next lint`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.next/**", "**/.wrangler/**", "**/node_modules/**", "drizzle/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  }
);
