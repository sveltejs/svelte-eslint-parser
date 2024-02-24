import type { ESLintExtendedProgram } from "..";
import type { NormalizedParserOptions } from "../parser-options";
import { parseScript, parseScriptInSvelte } from "../script";
import type { AnalyzeTypeScriptContext } from "./analyze";
import { analyzeTypeScript, analyzeTypeScriptInSvelte } from "./analyze";
import { setParent } from "./set-parent";
import type { TSESParseForESLintResult } from "./types";

/**
 * Parse for TypeScript in <script>
 */
export function parseTypeScriptInSvelte(
  code: { script: string; render: string; generics: string },
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
  context: AnalyzeTypeScriptContext,
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScriptInSvelte(code, attrs, parserOptions, context);

  const result = parseScriptInSvelte(tsCtx.script, attrs, parserOptions);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
/**
 * Parse for TypeScript
 */
export function parseTypeScript(
  code: string,
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScript(code, attrs, parserOptions);

  const result = parseScript(tsCtx.script, attrs, parserOptions);
  setParent(result);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
