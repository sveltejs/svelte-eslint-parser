import { lt } from "semver";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { compilerVersion, svelteVersion } from "./svelte-version.js";
import type { SvelteConfig } from "../svelte-config/index.js";
import { traverseNodes } from "../traverse.js";
import type { ESLintProgram } from "./index.js";
import type { SvelteScriptElement } from "../ast/index.js";

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

export function hasRunesSymbol(ast: ESLintProgram): boolean {
  const bindingTargets = new Set<unknown>();
  let hasRuneSymbol = false;
  traverseNodes(ast, {
    enterNode(node, parent) {
      if (hasRuneSymbol) {
        return;
      }
      if (
        node.type === "Identifier" &&
        runeSymbols.includes(node.name) &&
        isReference(node, parent) &&
        !bindingTargets.has(node)
      ) {
        hasRuneSymbol = true;
      }
      collectBindingTargets(node, bindingTargets);
    },
    leaveNode() {
      // do nothing
    },
  });

  return hasRuneSymbol;
}

/**
 * Checks whether the given identifier is a reference.
 * Svelte only counts references when it decides on runes mode.
 * This follows `is_reference` from the `is-reference` package used by `svelte/compiler`.
 */
function isReference(node: any, parent: any): boolean {
  switch (parent?.type) {
    // `bar` in `foo.bar`
    case "MemberExpression":
      return parent.computed || node === parent.object;
    // `foo` in `class { foo() {} }`
    case "MethodDefinition":
      return parent.computed;
    // `meta` in `import.meta`
    case "MetaProperty":
      return parent.meta === node;
    // `foo` in `class { foo = bar }` and `bar` in `{ bar: foo }`
    case "PropertyDefinition":
    case "Property":
      return parent.computed || node === parent.value;
    // `bar` in `export { foo as bar }` and `foo` in `import { foo as bar }`
    case "ExportSpecifier":
    case "ImportSpecifier":
      return node === parent.local;
    // `foo` in `foo: while (...) { break foo; }`
    case "LabeledStatement":
    case "BreakStatement":
    case "ContinueStatement":
      return false;
    default:
      return true;
  }
}

/**
 * Adds the patterns that the given node declares to `bindingTargets`.
 * Svelte declares these names, so it does not count them as references.
 * Default values and computed keys inside the patterns are not added.
 */
function collectBindingTargets(node: any, bindingTargets: Set<unknown>): void {
  const targets: unknown[] = [];
  switch (node.type) {
    case "VariableDeclarator":
      targets.push(node.id);
      break;
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      targets.push(node.id, ...node.params);
      break;
    // `ClassExpression` is not here, because Svelte does not declare its name.
    case "ClassDeclaration":
      targets.push(node.id);
      break;
    case "CatchClause":
      targets.push(node.param);
      break;
    case "SvelteEachBlock":
      targets.push(node.context, node.index);
      break;
    case "SvelteSnippetBlock":
      targets.push(node.id, ...node.params);
      break;
    case "SvelteAwaitThenBlock":
      targets.push(node.value);
      break;
    case "SvelteAwaitCatchBlock":
      targets.push(node.error);
      break;
    case "SvelteDirective":
      if (node.kind === "Let") targets.push(node.expression);
      break;
    default:
      if (bindingTargets.has(node)) {
        targets.push(...getPatternChildren(node));
      }
      break;
  }
  for (const target of targets) {
    if (target) bindingTargets.add(target);
  }
}

/**
 * Gets the child patterns of the given pattern that are also declared.
 * Default values and computed keys are not included.
 */
function getPatternChildren(node: any): unknown[] {
  switch (node.type) {
    case "ObjectPattern":
      return node.properties.map((property: any) =>
        property.type === "Property" ? property.value : property,
      );
    case "ArrayPattern":
      return node.elements;
    case "RestElement":
      return [node.argument];
    case "AssignmentPattern":
      return [node.left];
    default:
      return [];
  }
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
