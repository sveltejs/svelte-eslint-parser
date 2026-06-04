import type { ESLintExtendedProgram } from "../index.js";
import type { NormalizedParserOptions } from "../parser-options.js";
import { parseScript, parseScriptInSvelte } from "../script.js";
import type { SvelteParseContext } from "../svelte-parse-context.js";
import type { AnalyzeTypeScriptContext } from "./analyze/index.js";
import {
  analyzeTypeScript,
  analyzeTypeScriptInSvelte,
} from "./analyze/index.js";
import { setParent } from "./set-parent.js";
import type { TSESParseForESLintResult } from "./types.js";
import { primeTranslationCache } from "../../ts-sys-hook.js";

/**
 * Parse for TypeScript in <script>
 */
export function parseTypeScriptInSvelte(
  code: { script: string; render: string; rootScope: string },
  attrs: Record<string, string | undefined>,
  parserOptions: NormalizedParserOptions,
  context: AnalyzeTypeScriptContext,
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScriptInSvelte(code, attrs, parserOptions, context);

  // Share the shim with the ts.sys hook so projectService reads hit a cache.
  if (parserOptions.filePath) {
    primeTranslationCache(parserOptions.filePath, tsCtx.script);
  }

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
  svelteParseContext: SvelteParseContext,
): ESLintExtendedProgram {
  const tsCtx = analyzeTypeScript(
    code,
    attrs,
    parserOptions,
    svelteParseContext,
  );

  const result = parseScript(tsCtx.script, attrs, parserOptions);
  setParent(result);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
