import type { ESLintExtendedProgram } from "..";
import { parseScript } from "../script";
import { analyzeTypeScript } from "./analyze";
import type { TSESParseForESLintResult } from "./types";

/**
 * Parse for type script
 */
export function parseTypeScript(
  code: { script: string; render: string },
  attrs: Record<string, string | undefined>,
  parserOptions: any = {}
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScript(code, attrs, parserOptions);

  const result = parseScript(tsCtx.script, attrs, parserOptions);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
