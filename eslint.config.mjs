import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import mochaPlugin from "eslint-plugin-mocha";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    }
  },
  {
    files: ["**/*.test.js"],
    plugins: { mocha: mochaPlugin },
    extends: ["plugin:mocha/recommended"],
    rules: {
      "mocha/no-exclusive-tests": "error",
      "mocha/no-skipped-tests": "warn",
      "mocha/handle-done-callback": "off",
    },
  },
]);
