import type { TSESTree } from "@typescript-eslint/types";
import { UniqueIdGenerator } from "../../context/unique.js";
import { RestoreContext } from "./restore.js";
import type { TSESParseForESLintResult } from "./types.js";

/**
 * Information about a .svelte import in the virtual code.
 */
export interface SvelteImportInfo {
  /** Start position in the virtual code (after the opening quote) */
  start: number;
  /** End position in the virtual code (before the closing quote) */
  end: number;
  /** The import path (e.g., '$lib/Button.svelte') */
  importPath: string;
}

/**
 * Check if a path is a .svelte import (including .svelte.ts and .svelte.js).
 */
function isSvelteImport(importPath: string): boolean {
  return (
    importPath.endsWith(".svelte") ||
    importPath.endsWith(".svelte.ts") ||
    importPath.endsWith(".svelte.js")
  );
}

/**
 * Extract .svelte imports from an AST.
 * Also extracts .svelte.ts and .svelte.js imports.
 */
export function extractSvelteImportsFromAST(
  ast: TSESParseForESLintResult["ast"],
): string[] {
  const svelteImports: string[] = [];

  for (const node of ast.body) {
    // import X from '...svelte' or '...svelte.ts' or '...svelte.js'
    if (
      node.type === "ImportDeclaration" &&
      node.source.type === "Literal" &&
      typeof node.source.value === "string" &&
      isSvelteImport(node.source.value)
    ) {
      svelteImports.push(node.source.value);
    }
    // export X from '...svelte' or '...svelte.ts' or '...svelte.js'
    if (
      node.type === "ExportNamedDeclaration" &&
      node.source?.type === "Literal" &&
      typeof node.source.value === "string" &&
      isSvelteImport(node.source.value)
    ) {
      svelteImports.push(node.source.value);
    }
    // export * from '...svelte' or '...svelte.ts' or '...svelte.js'
    if (
      node.type === "ExportAllDeclaration" &&
      node.source.type === "Literal" &&
      typeof node.source.value === "string" &&
      isSvelteImport(node.source.value)
    ) {
      svelteImports.push(node.source.value);
    }
  }

  // Also check for dynamic imports in expressions
  traverseForDynamicImports(ast, svelteImports);

  return svelteImports;
}

/**
 * Traverse the AST to find dynamic imports (import('...svelte') or import('...svelte.ts') or import('...svelte.js')).
 */
function traverseForDynamicImports(
  ast: TSESParseForESLintResult["ast"],
  svelteImports: string[],
): void {
  function visit(node: TSESTree.Node | null | undefined): void {
    if (!node) return;

    // Check for import('...svelte') or import('...svelte.ts') or import('...svelte.js')
    if (
      node.type === "ImportExpression" &&
      node.source.type === "Literal" &&
      typeof node.source.value === "string" &&
      isSvelteImport(node.source.value)
    ) {
      svelteImports.push(node.source.value);
    }

    // Traverse child nodes
    for (const key of Object.keys(node)) {
      if (key === "parent") continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === "object" && "type" in item) {
            visit(item as TSESTree.Node);
          }
        }
      } else if (child && typeof child === "object" && "type" in child) {
        visit(child as TSESTree.Node);
      }
    }
  }

  for (const node of ast.body) {
    visit(node);
  }
}

/**
 * Context for virtual TypeScript code.
 * See https://github.com/sveltejs/svelte-eslint-parser/blob/main/docs/internal-mechanism.md#scope-types
 */
export class VirtualTypeScriptContext {
  private readonly originalCode: string;

  public readonly restoreContext: RestoreContext;

  public script = "";

  private consumedIndex = 0;

  private readonly unique = new UniqueIdGenerator();

  public _beforeResult: TSESParseForESLintResult | null = null;

  /** .svelte imports extracted from the AST */
  public svelteImports: SvelteImportInfo[] = [];

  public constructor(code: string) {
    this.originalCode = code;
    this.restoreContext = new RestoreContext(code);
  }

  public skipOriginalOffset(offset: number): void {
    this.consumedIndex += offset;
  }

  public skipUntilOriginalOffset(offset: number): void {
    this.consumedIndex = Math.max(offset, this.consumedIndex);
  }

  public appendOriginalToEnd(): void {
    this.appendOriginal(this.originalCode.length);
  }

  public appendOriginal(index: number): void {
    if (this.consumedIndex >= index) {
      return;
    }
    this.restoreContext.addOffset({
      original: this.consumedIndex,
      dist: this.script.length,
    });
    this.script += this.originalCode.slice(this.consumedIndex, index);
    this.consumedIndex = index;
  }

  public appendVirtualScript(virtualFragment: string): void {
    const start = this.script.length;
    this.script += virtualFragment;
    this.restoreContext.addVirtualFragmentRange(start, this.script.length);
  }

  public generateUniqueId(base: string): string {
    return this.unique.generate(base, this.originalCode, this.script);
  }

  /**
   * Compute the positions of .svelte imports in the virtual code.
   * This should be called after the virtual code is fully constructed.
   */
  public computeSvelteImportPositions(importPaths: string[]): void {
    this.svelteImports = [];

    for (const importPath of importPaths) {
      // Search for all occurrences of the import path in the virtual code
      // We look for patterns like 'path' or "path"
      const patterns = [`'${importPath}'`, `"${importPath}"`];

      for (const pattern of patterns) {
        let searchStart = 0;
        while (true) {
          const index = this.script.indexOf(pattern, searchStart);
          if (index === -1) break;

          this.svelteImports.push({
            start: index + 1, // Skip the opening quote
            end: index + pattern.length - 1, // Before the closing quote
            importPath,
          });

          searchStart = index + pattern.length;
        }
      }
    }

    // Sort by position
    this.svelteImports.sort((a, b) => a.start - b.start);
  }
}
