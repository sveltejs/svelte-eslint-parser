/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import type { Linter } from "eslint";
import { BASIC_PARSER_OPTIONS } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
export function setupLinter(linter: Linter) {
  linter.defineRule(
    "@typescript-eslint/no-unsafe-argument",
    rules["no-unsafe-argument"] as never
  );
}

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: BASIC_PARSER_OPTIONS,
    rules: {
      "@typescript-eslint/no-unsafe-argument": "error",
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
