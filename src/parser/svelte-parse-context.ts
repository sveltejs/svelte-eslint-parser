import { lt } from "semver";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { compilerVersion, svelteVersion } from "./svelte-version.js";
import type { SvelteConfig } from "../svelte-config/index.js";
import { traverseNodes } from "../traverse.js";
import type { ESLintProgram } from "./index.js";
import type { SvelteScriptElement } from "../ast/index.js";
import type * as ESTree from "estree";
import type { Scope } from "eslint";

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
 * Checks whether the component references a rune that is not declared anywhere.
 * Svelte turns on runes mode for such a reference.
 * Call this before the rune names are added to the global scope.
 */
export function hasRuneReference(scopeManager: ScopeManager): boolean {
  const topScope =
    scopeManager.scopes.find((scope) => scope.type === "module") ??
    scopeManager.globalScope!;
  return scopeManager.globalScope!.through.some(
    (reference) =>
      runeSymbols.includes(reference.identifier.name) &&
      !isInType(reference.identifier) &&
      !isStoreSubscription(reference.identifier.name, topScope),
  );
}

/**
 * Checks whether the given node is in a TypeScript type, such as `typeof $state` in `let a: typeof $state`.
 * Svelte removes the types before it decides on runes mode.
 */
function isInType(node: ESTree.Node): boolean {
  for (let target: any = node; target; target = target.parent) {
    if (isTypeOnlyNode(target)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether Svelte treats the given rune name as a store subscription,
 * such as `$state` when the component declares `state`.
 * This follows the synthetic store bindings in `analyze_component` of `svelte/compiler`.
 */
function isStoreSubscription(name: string, topScope: Scope.Scope): boolean {
  const storeName = name.slice(1);
  const def = topScope.set.get(storeName)?.defs[0];
  // Svelte removes the types, so a type does not declare the name.
  if (!def || isTypeOnlyNode(def.node) || isTypeOnlyNode(def.parent)) {
    return false;
  }
  // `import { derived } from 'svelte/store'` does not make `$derived` a store.
  if (
    name === "$derived" &&
    def.type === "ImportBinding" &&
    def.parent.source.value === "svelte/store"
  ) {
    return false;
  }
  // `$state` is still a rune in `let state = $state(0)`.
  return def.type !== "Variable" || !isRuneCall(def.node.init);
}

/**
 * Checks whether the given expression calls a rune, such as `$state(0)` and `$state.raw(0)`.
 * This is a simple version of `get_rune` in `svelte/compiler`.
 */
function isRuneCall(node: ESTree.Node | null | undefined): boolean {
  let expression: any = node;
  // Svelte removes the types, so `$state(0) as number` is `$state(0)`.
  while (expression && tsNodesWithExpression.has(expression.type)) {
    expression = expression.expression;
  }
  if (expression?.type !== "CallExpression") {
    return false;
  }
  let callee = expression.callee;
  if (callee.type === "MemberExpression" && !callee.computed) {
    callee = callee.object;
  }
  return callee.type === "Identifier" && runeSymbols.includes(callee.name);
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
 * Checks whether Svelte removes the given node with the TypeScript types.
 * See `remove_typescript_nodes` in `svelte/compiler`.
 */
function isTypeOnlyNode(node: any): boolean {
  if (!node) {
    return false;
  }
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
