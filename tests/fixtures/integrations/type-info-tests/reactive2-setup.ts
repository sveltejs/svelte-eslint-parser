/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import type { Linter } from "eslint";
import { BASIC_PARSER_OPTIONS } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
export function setupLinter(linter: Linter) {
  linter.defineRule(
    "@typescript-eslint/no-unsafe-assignment",
    rules["no-unsafe-assignment"] as never
  );
  linter.defineRule(
    "@typescript-eslint/no-unsafe-member-access",
    rules["no-unsafe-member-access"] as never
  );
}

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: BASIC_PARSER_OPTIONS,
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
