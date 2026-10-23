import type { ESLintExtendedProgram } from "../index.js";
import type { NormalizedParserOptions } from "../parser-options.js";
import {
  parseScript,
  parseScriptInSvelte,
  parseScriptWithoutAnalyzeScope,
} from "../script.js";
import type { SvelteParseContext } from "../svelte-parse-context.js";
import type { AnalyzeTypeScriptContext } from "./analyze/index.js";
import {
  analyzeTypeScript,
  analyzeTypeScriptInSvelte,
} from "./analyze/index.js";
import { setParent } from "./set-parent.js";
import type { TSESParseForESLintResult } from "./types.js";
import {
  getCompanionToRefresh,
  primeTranslationCache,
  reloadCompanionInProjectServices,
} from "../../ts-sys-hook.js";
import { getJavaScriptParserOptions } from "./javascript.js";

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
    // Before the component's own parse, so when the program already holds the
    // companion, the component's rules see it current too, as in a component
    // that imports itself.
    refreshCompanion(parserOptions.filePath, parserOptions);
  }

  // Virtual scripts can be parsed repeatedly for the same file. In single-run
  // mode, typescript-eslint falls back to an isolated program on later calls,
  // losing project imports and compiler options.
  let result = parseScriptInSvelte(tsCtx.script, attrs, {
    ...parserOptions,
    disallowAutomaticSingleRunInference: true,
  });
  const jsOptions = getJavaScriptParserOptions(result, attrs, parserOptions);
  if (jsOptions) {
    result = parseScriptInSvelte(tsCtx.script, attrs, jsOptions);
  }

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}

/**
 * Let the type-aware parser pick up the new content of the `X.svelte.ts`
 * companion that importers see. See `getCompanionToRefresh`.
 */
function refreshCompanion(
  filePath: string,
  parserOptions: NormalizedParserOptions,
): void {
  if (
    parserOptions.projectService != null ||
    parserOptions.EXPERIMENTAL_useProjectService != null
  ) {
    const companion = getCompanionToRefresh(filePath);
    if (companion) reloadCompanionInProjectServices(companion.filePath);
    return;
  }
  if (parserOptions.project == null) return;
  const companion = getCompanionToRefresh(filePath);
  if (!companion) return;
  // Parsing the companion path makes typescript-eslint fire the companion's
  // file watcher, as it does for a linted file.
  try {
    parseScriptWithoutAnalyzeScope(
      companion.code,
      { lang: "ts" },
      {
        ...parserOptions,
        filePath: companion.filePath,
        disallowAutomaticSingleRunInference: true,
      },
    );
  } catch {
    // The refresh is best effort. Linting the component itself has succeeded.
  }
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

  let result = parseScript(tsCtx.script, attrs, {
    ...parserOptions,
    disallowAutomaticSingleRunInference: true,
  });
  const jsOptions = getJavaScriptParserOptions(result, attrs, parserOptions);
  if (jsOptions) {
    result = parseScript(tsCtx.script, attrs, jsOptions);
  }
  setParent(result);

  tsCtx.restoreContext.restore(result as unknown as TSESParseForESLintResult);

  return result;
}
