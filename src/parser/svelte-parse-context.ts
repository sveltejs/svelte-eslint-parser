import { lt } from "semver";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { compilerVersion, svelteVersion } from "./svelte-version.js";
import type { SvelteConfig } from "../svelte-config/index.js";
import { traverseNodes } from "../traverse.js";
import type { ESLintProgram } from "./index.js";
import type { SvelteProgram, SvelteScriptElement } from "../ast/index.js";
import type * as ESTree from "estree";
import type { Scope } from "eslint";
import type { VisitorKeys } from "eslint-visitor-keys";

type ScopeManager = Scope.ScopeManager;

const runeSymbols: string[] = [
  "$state",
  "$derived",
  "$effect",
  "$props",
  "$bindable",
  "$inspect",
  "$host",
] as const;

/** The context for parsing. */
export type SvelteParseContext = {
  /**
   * Determines if the file is in Runes mode.
   *
   * - Svelte 3/4 does not support Runes mode.
   * - Checks if `runes` configuration exists in:
   *   - `parserOptions`
   *   - `<svelte:options>` in the Svelte file.
   *   - `svelte.config.js`
   * - Returns `true` if the `runes` symbol is present in the Svelte file.
   * - Returns `true` if the Svelte file has a top-level `await` (Svelte 5.36+).
   */
  runes?: boolean;
  /** The version of "svelte/compiler". */
  compilerVersion: string;
  /** The result of static analysis of `svelte.config.js`. */
  svelteConfig: SvelteConfig | null;
};

export function resolveSvelteParseContextForSvelte(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
  svelteAst: Compiler.Root | SvAST.AstLegacy,
): SvelteParseContext {
  return {
    runes: isRunesAsParseContext(svelteConfig, parserOptions, svelteAst),
    compilerVersion,
    svelteConfig,
  };
}

export function resolveSvelteParseContextForSvelteScript(
  svelteConfig: SvelteConfig | null,
): SvelteParseContext {
  return {
    // .svelte.js files are always in Runes mode for Svelte 5.
    runes: svelteVersion.gte(5),
    compilerVersion,
    svelteConfig,
  };
}

function isRunesAsParseContext(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
  svelteAst: Compiler.Root | SvAST.AstLegacy,
): boolean | undefined {
  // Svelte 3/4 does not support Runes mode.
  if (!svelteVersion.gte(5)) {
    return false;
  }

  // Parser option.
  if (parserOptions.svelteFeatures?.runes != null) {
    return parserOptions.svelteFeatures?.runes;
  }

  // `<svelte:options>` takes precedence over the compiler option, like the Svelte compiler.
  const svelteOptions = (svelteAst as Compiler.Root).options;
  if (svelteOptions?.runes != null) {
    return svelteOptions?.runes;
  }

  // Compiler option.
  if (svelteConfig?.compilerOptions?.runes != null) {
    return typeof svelteConfig.compilerOptions?.runes === "function"
      ? svelteConfig.compilerOptions.runes({
          filename: parserOptions.filePath ?? "",
        })
      : svelteConfig.compilerOptions?.runes;
  }

  return undefined;
}

/**
 * Gets the identifiers of the rune references that are not declared anywhere.
 * Svelte turns on runes mode for such a reference.
 * Call this before the rune names are added to the global scope.
 */
export function getRuneReferences(
  scopeManager: ScopeManager,
): Set<ESTree.Identifier> {
  const identifiers = new Set<ESTree.Identifier>();
  for (const reference of scopeManager.globalScope!.through) {
    if (
      runeSymbols.includes(reference.identifier.name) &&
      // A type reference from `@typescript-eslint/scope-manager`.
      (reference as { isValueReference?: boolean }).isValueReference !== false
    ) {
      identifiers.add(reference.identifier);
    }
  }
  return identifiers;
}

/**
 * Checks whether the component has a rune reference that Svelte counts.
 * `runeReferences` comes from `getRuneReferences`.
 * `visitorKeys` must include the keys of the TypeScript nodes, such as `typeAnnotation`.
 */
export function hasRunesReference(
  ast: ESLintProgram,
  runeReferences: Set<ESTree.Identifier>,
  visitorKeys: VisitorKeys,
): boolean {
  if (hasRuneReExport(ast)) {
    return true;
  }
  if (!runeReferences.size) {
    return false;
  }
  // Svelte removes the TypeScript types before it decides on runes mode.
  const referencesInTypes = new Set<unknown>();
  let typeOnlyNode: unknown = null;
  traverseNodes(ast, {
    visitorKeys,
    enterNode(node) {
      if (typeOnlyNode) {
        if (runeReferences.has(node as ESTree.Identifier)) {
          referencesInTypes.add(node);
        }
      } else if (isTypeOnlyNode(node)) {
        typeOnlyNode = node;
      }
    },
    leaveNode(node) {
      if (typeOnlyNode === node) {
        typeOnlyNode = null;
      }
    },
  });
  for (const identifier of runeReferences) {
    if (!referencesInTypes.has(identifier)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a script re-exports a rune name, such as `export { $state } from 'x'`.
 * The local name of the specifier is not a reference in the scope analysis,
 * but Svelte counts it because `is_reference` from `is-reference` returns `true` for it.
 */
function hasRuneReExport(ast: ESLintProgram): boolean {
  // The scripts are moved into the `SvelteScriptElement`s at this point.
  for (const element of (ast as unknown as SvelteProgram).body) {
    if (element.type !== "SvelteScriptElement") {
      continue;
    }
    for (const statement of element.body) {
      if (
        statement.type === "ExportNamedDeclaration" &&
        statement.source &&
        !isTypeOnlyNode(statement) &&
        statement.specifiers.some(
          (specifier) =>
            !isTypeOnlyNode(specifier) &&
            specifier.local.type === "Identifier" &&
            runeSymbols.includes(specifier.local.name),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * TypeScript nodes that hold a JavaScript expression.
 * Svelte keeps the expression and removes the type.
 */
const tsNodesWithExpression = new Set<string>([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "TSParameterProperty",
  "TSExportAssignment",
]);

/**
 * Checks whether the given node is removed with the TypeScript types.
 * See `remove_typescript_nodes` in `svelte/compiler`.
 */
function isTypeOnlyNode(node: any): boolean {
  if (node.type.startsWith("TS")) {
    return !tsNodesWithExpression.has(node.type);
  }
  return (
    node.declare === true ||
    node.importKind === "type" ||
    node.exportKind === "type"
  );
}

const functionTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

/**
 * Checks whether the component has an `await` that is not inside a function,
 * in the instance script or in the template.
 * Since Svelte 5.36, the compiler turns on runes mode for such an `await`.
 * An `await` in the module script does not count.
 */
export function hasTopLevelAwait(ast: ESLintProgram): boolean {
  if (lt(compilerVersion, "5.36.0")) {
    return false;
  }
  let found = false;
  let skipped: unknown = null;
  let functionDepth = 0;
  traverseNodes(ast, {
    enterNode(node) {
      if (found || skipped) {
        return;
      }
      if (isModuleScript(node)) {
        skipped = node;
        return;
      }
      if (functionTypes.has(node.type)) {
        functionDepth++;
      } else if (node.type === "AwaitExpression" && functionDepth === 0) {
        found = true;
      }
    },
    leaveNode(node) {
      if (skipped) {
        if (skipped === node) {
          skipped = null;
        }
        return;
      }
      if (functionTypes.has(node.type)) {
        functionDepth--;
      }
    },
  });

  return found;
}

/** Checks whether the given node is `<script module>` or `<script context="module">`. */
function isModuleScript(node: { type: string }): boolean {
  if (node.type !== "SvelteScriptElement") {
    return false;
  }
  return (node as SvelteScriptElement).startTag.attributes.some(
    (attr) =>
      attr.type === "SvelteAttribute" &&
      (attr.key.name === "module" ||
        (attr.key.name === "context" &&
          attr.value.length === 1 &&
          attr.value[0].type === "SvelteLiteral" &&
          attr.value[0].value === "module")),
  );
}
