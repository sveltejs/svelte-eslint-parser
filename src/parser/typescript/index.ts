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
import { getVirtualCodeCacheManager } from "../../virtual-code/index.js";

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

  // Use virtual file path for type-aware linting if cache is enabled
  let effectiveParserOptions = parserOptions;
  if (parserOptions.svelteFeatures?.experimentalGenerateVirtualCodeCache) {
    const cacheManager = getVirtualCodeCacheManager();
    if (cacheManager.isInitialized() && parserOptions.filePath) {
      const virtualFilePath = cacheManager.getVirtualFilePathForSvelteFile(
        parserOptions.filePath,
      );
      const generatedTsconfig = cacheManager.getGeneratedTsconfigPath();
      if (virtualFilePath && generatedTsconfig) {
        // Use virtual file path for TypeScript to find type information
        // Try using projectService if available, otherwise fall back to project option
        const useProjectService = Boolean(
          parserOptions.projectService ||
            parserOptions.EXPERIMENTAL_useProjectService,
        );
        if (useProjectService) {
          // When projectService is enabled, it will find tsconfig.json from the virtual file path
          // The .svelte-eslint-parser/tsconfig.json should be discovered automatically
          effectiveParserOptions = {
            ...parserOptions,
            filePath: virtualFilePath,
            // Don't set project - projectService ignores it and shows a warning
          };
        } else {
          // When projectService is not available, use project option
          effectiveParserOptions = {
            ...parserOptions,
            filePath: virtualFilePath,
            project: generatedTsconfig,
            projectService: undefined,
            EXPERIMENTAL_useProjectService: undefined,
          };
        }

        // Only update virtual file if the source file has changed
        // This check uses the original Svelte file content hash from initialize()
        const needsUpdate = cacheManager.needsUpdateByFilePath(
          parserOptions.filePath,
        );
        if (needsUpdate) {
          cacheManager.updateVirtualCodeByFilePath(parserOptions.filePath, {
            code: tsCtx.script,
            svelteImports: tsCtx.svelteImports,
          });
        }
      }
    }
  }

  const result = parseScriptInSvelte(
    tsCtx.script,
    attrs,
    effectiveParserOptions,
  );

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
