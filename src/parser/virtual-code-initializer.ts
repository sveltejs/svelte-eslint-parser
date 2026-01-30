import type { NormalizedParserOptions } from "./parser-options.js";
import {
  getVirtualCodeCacheManager,
  type VirtualCodeResult,
} from "../virtual-code/index.js";
import { Context } from "../context/index.js";
import { parseTemplate } from "./template.js";
import {
  resolveSvelteParseContextForSvelte,
  type SvelteParseContext,
} from "./svelte-parse-context.js";
import { analyzeTypeScriptInSvelte } from "./typescript/analyze/index.js";
import { resolveSvelteConfigFromOption } from "../svelte-config/index.js";

/**
 * Initialize the virtual code cache.
 * This is called once when the first file is parsed with projectService or project option.
 */
export function initializeVirtualCodeCache(
  filePath: string,
  parserOptions: NormalizedParserOptions,
): void {
  const cacheManager = getVirtualCodeCacheManager();

  if (cacheManager.isInitialized()) {
    return;
  }

  cacheManager.initialize(
    filePath,
    parserOptions,
    (svelteFilePath, content) => {
      return generateVirtualCodeForFile(svelteFilePath, content, parserOptions);
    },
  );
}

/**
 * Generate virtual TypeScript code for a Svelte file.
 * Returns null if the file cannot be processed or is not TypeScript.
 */
function generateVirtualCodeForFile(
  filePath: string,
  content: string,
  parserOptions: NormalizedParserOptions,
): VirtualCodeResult | null {
  try {
    // Create a minimal parser options for virtual code generation
    const virtualParserOptions: NormalizedParserOptions = {
      ...parserOptions,
      filePath,
      // Disable project/projectService to avoid infinite recursion
      project: null,
      projectService: undefined,
      EXPERIMENTAL_useProjectService: undefined,
    };

    // Create context
    const ctx = new Context(content, virtualParserOptions);

    // Check if the file is TypeScript
    if (!ctx.isTypeScript()) {
      return null;
    }

    // Parse template to get Svelte AST (needed for svelteParseContext)
    const resultTemplate = parseTemplate(
      ctx.sourceCode.template,
      ctx,
      virtualParserOptions,
    );

    // Resolve Svelte config
    const svelteConfig = resolveSvelteConfigFromOption({
      ...parserOptions,
      filePath,
    });

    // Create Svelte parse context
    const svelteParseContext: SvelteParseContext =
      resolveSvelteParseContextForSvelte(
        svelteConfig,
        virtualParserOptions,
        resultTemplate.svelteAst,
      );

    // Get script info
    const scripts = ctx.sourceCode.scripts;
    const codeInfo = scripts.getCurrentVirtualCodeInfo();

    // Generate virtual TypeScript code using the existing analyzer
    const tsCtx = analyzeTypeScriptInSvelte(
      codeInfo,
      scripts.attrs,
      virtualParserOptions,
      { slots: ctx.slots, svelteParseContext },
    );

    return {
      code: tsCtx.script,
      svelteImports: tsCtx.svelteImports,
    };
  } catch {
    // Return null if generation fails
    return null;
  }
}

/**
 * Update virtual code for a single file.
 * Called when a file is modified and needs to be re-processed.
 */
export function updateVirtualCodeForFile(
  filePath: string,
  content: string,
  virtualCodeResult: VirtualCodeResult,
): void {
  const cacheManager = getVirtualCodeCacheManager();
  if (!cacheManager.isInitialized()) {
    return;
  }

  cacheManager.updateVirtualCode(filePath, content, virtualCodeResult);
}
