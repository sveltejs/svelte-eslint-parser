/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
export function setupLinter(linter: Linter) {
  linter.defineRule(
    "@typescript-eslint/no-confusing-void-expression",
    rules["no-confusing-void-expression"] as never,
  );
  linter.defineRule(
    "@typescript-eslint/explicit-function-return-type",
    rules["explicit-function-return-type"] as never,
  );
}

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: generateParserOptions(),
    rules: {
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "no-unreachable": "error",
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
