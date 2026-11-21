import type * as ts from "typescript";
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

  if (parserOptions.project != null) rememberProgram(result);

  return result;
}

// The latest program typescript-eslint gave for each tsconfig, keyed by the
// tsconfig path. Used to find the programs that hold a companion.
const programsByConfig = new Map<string, ts.Program>();

function rememberProgram(result: ESLintExtendedProgram): void {
  const program = result.services?.program as ts.Program | null | undefined;
  const configFilePath = program?.getCompilerOptions().configFilePath;
  if (typeof configFilePath === "string") {
    programsByConfig.set(configFilePath, program!);
  }
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
  // file watcher in every program that holds it, as it does for a linted file.
  // The companion is no tsconfig's root file, so typescript-eslint also looks
  // for it in each tsconfig in `project`. A tsconfig without it gets its folder
  // watchers fired, which rebuilds every program. So pass only the tsconfigs
  // whose programs hold the companion.
  const projects = [...programsByConfig]
    .filter(([, program]) => program.getSourceFile(companion.filePath))
    .map(([configFilePath]) => configFilePath);
  try {
    parseScriptWithoutAnalyzeScope(
      companion.code,
      { lang: "ts" },
      {
        ...parserOptions,
        project: projects.length ? projects : parserOptions.project,
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
