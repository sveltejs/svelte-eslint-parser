import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { compilerVersion, svelteVersion } from "./svelte-version.js";
import type { SvelteConfig } from "../svelte-config/index.js";

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

export function isEnableRunes(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): boolean {
  if (!svelteVersion.gte(5)) return false;
  if (parserOptions.svelteFeatures?.runes != null) {
    return Boolean(parserOptions.svelteFeatures.runes);
  }
  if (svelteConfig?.compilerOptions?.runes != null) {
    return Boolean(svelteConfig.compilerOptions.runes);
  }
  return true;
}

export function resolveSvelteParseContextForSvelte(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
  svelteAst: Compiler.Root | SvAST.AstLegacy,
): SvelteParseContext {
  const svelteOptions = (svelteAst as Compiler.Root).options;
  if (svelteOptions?.runes != null) {
    return {
      runes: svelteOptions.runes,
      compilerVersion,
      svelteConfig,
    };
  }

  return {
    runes: isEnableRunes(svelteConfig, parserOptions),
    compilerVersion,
    svelteConfig,
  };
}

export function resolveSvelteParseContextForSvelteScript(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): SvelteParseContext {
  return resolveSvelteParseContext(svelteConfig, parserOptions);
}

function resolveSvelteParseContext(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): SvelteParseContext {
  return {
    runes: isEnableRunes(svelteConfig, parserOptions),
    compilerVersion,
    svelteConfig,
  };
}
