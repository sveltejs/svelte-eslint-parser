/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import { generateParserOptions } from "../../../src/parser/test-utils";
import * as ts from "@typescript-eslint/parser";

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: generateParserOptions({ parser: { ts } }),
    env: {
      browser: true,
      es2021: true,
    },
  };
}
