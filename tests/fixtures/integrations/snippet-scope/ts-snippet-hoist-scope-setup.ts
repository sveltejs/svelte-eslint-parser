/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
export function setupLinter(linter: Linter) {
  linter.defineRule(
    "@typescript-eslint/no-unused-vars",
    rules["no-unused-vars"] as never,
  );
}

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: {
      ...generateParserOptions(),
      svelteFeatures: { runes: true },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
