/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { rules } from "eslint-plugin-svelte";
export function setupLinter(linter: Linter) {
  linter.defineRule(
    "svelte/no-immutable-reactive-statements",
    rules["no-immutable-reactive-statements"] as never,
  );
}

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: generateParserOptions(),
    rules: {
      "svelte/no-immutable-reactive-statements": "error",
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
