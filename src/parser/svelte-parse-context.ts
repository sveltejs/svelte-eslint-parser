import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type * as ESTree from "estree";
import type { NormalizedParserOptions } from "./parser-options.js";
import { compilerVersion, svelteVersion } from "./svelte-version.js";
import type { SvelteConfig } from "../svelte-config/index.js";
import { traverseNodes } from "../traverse.js";

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
   * Whether to use Runes mode.
   * May be `true` if the user is using Svelte v5.
   * Resolved from `svelte.config.js` or `parserOptions`, but may be overridden by `<svelte:options>`.
   */
  runes: boolean;
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
    runes: isRunes(svelteConfig, parserOptions, svelteAst),
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

function isRunes(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
  svelteAst: Compiler.Root | SvAST.AstLegacy,
): boolean {
  // Svelte 3/4 does not support Runes mode.
  if (!svelteVersion.gte(5)) {
    return false;
  }

  // Compiler option.
  if (parserOptions.svelteFeatures?.runes != null) {
    return parserOptions.svelteFeatures?.runes;
  }
  if (svelteConfig?.compilerOptions?.runes != null) {
    return svelteConfig?.compilerOptions?.runes;
  }

  // `<svelte:options>`.
  const svelteOptions = (svelteAst as Compiler.Root).options;
  if (svelteOptions?.runes != null) {
    return svelteOptions?.runes;
  }

  // Static analysis.
  const { module, instance } = svelteAst;
  return (
    (module != null && hasRuneSymbol(module)) ||
    (instance != null && hasRuneSymbol(instance))
  );
}

function hasRuneSymbol(ast: Compiler.Script | SvAST.Script): boolean {
  let hasRuneSymbol = false;
  traverseNodes(ast as unknown as ESTree.Node, {
    enterNode(node) {
      if (hasRuneSymbol) {
        return;
      }
      if (node.type === "Identifier" && runeSymbols.includes(node.name)) {
        hasRuneSymbol = true;
      }
    },
    leaveNode() {
      // do nothing
    },
  });

  return hasRuneSymbol;
}
