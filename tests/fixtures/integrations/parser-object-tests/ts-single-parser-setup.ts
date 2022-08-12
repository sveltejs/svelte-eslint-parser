/* eslint eslint-comments/require-description: 0, @typescript-eslint/explicit-module-boundary-types: 0 */
import { BASIC_PARSER_OPTIONS } from "../../../src/parser/test-utils";
import * as parser from "@typescript-eslint/parser";

export function getConfig() {
  return {
    parser: "svelte-eslint-parser",
    parserOptions: {
      ...BASIC_PARSER_OPTIONS,
      parser,
    },
    env: {
      browser: true,
      es2021: true,
    },
  };
}
