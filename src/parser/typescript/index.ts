import type { ESLintExtendedProgram } from "..";
import { parseScriptInSvelte } from "../script";
import type { AnalyzeTypeScriptContext } from "./analyze";
import { analyzeTypeScript } from "./analyze";
import type { TSESParseForESLintResult } from "./types";

/**
 * Parse for type script
 */
export function parseTypeScript(
  code: { script: string; render: string },
  attrs: Record<string, string | undefined>,
  parserOptions: unknown,
  context: AnalyzeTypeScriptContext,
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScript(code, attrs, parserOptions, context);

  const result = parseScriptInSvelte(tsCtx.script, attrs, parserOptions);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
