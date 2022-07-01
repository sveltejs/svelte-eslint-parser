import type { ESLintExtendedProgram, ESLintProgram } from ".";
import { getEspree } from "./espree";
/**
 * The interface of a result of ESLint custom parser.
 */
export type ESLintCustomParserResult = ESLintProgram | ESLintExtendedProgram;
/**
 * The interface of ESLint custom parsers.
 */
export interface ESLintCustomParser {
  parse(code: string, options: any): ESLintCustomParserResult;
  parseForESLint?(code: string, options: any): ESLintCustomParserResult;
}

/** Get parser name */
export function getParserName(
  attrs: Record<string, string | undefined>,
  parser: any
): string {
  if (parser) {
    if (typeof parser === "string" && parser !== "espree") {
      return parser;
    } else if (typeof parser === "object") {
      const name = parser[attrs.lang || "js"];
      if (typeof name === "string") {
        return getParserName(attrs, name);
      }
    }
  }
  return "espree";
}

/** Get parser */
export function getParser(
  attrs: Record<string, string | undefined>,
  parser: any
): ESLintCustomParser {
  const name = getParserName(attrs, parser);
  if (name !== "espree") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ignore
    return require(name);
  }
  return getEspree();
}
