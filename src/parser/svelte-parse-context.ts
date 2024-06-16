import type * as Compiler from "svelte/compiler";
import type * as SvAST from "./svelte-ast-types";
import type { NormalizedParserOptions } from "./parser-options";
import { compilerVersion, svelteVersion } from "./svelte-version";
import type { StaticSvelteConfigFile } from "../svelte-config";

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
  svelteConfig: StaticSvelteConfigFile | null;
};

export function isEnableRunes(
  svelteConfig: StaticSvelteConfigFile | null,
  parserOptions: NormalizedParserOptions,
): boolean {
  if (!svelteVersion.gte(5)) return false;
  if (parserOptions.svelteFeatures?.runes != null) {
    return Boolean(parserOptions.svelteFeatures.runes);
  } else if (svelteConfig?.config.compilerOptions?.runes != null) {
    return Boolean(svelteConfig.config.compilerOptions.runes);
  }
  return false;
}

export function resolveSvelteParseContextForSvelte(
  svelteConfig: StaticSvelteConfigFile | null,
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
  svelteConfig: StaticSvelteConfigFile | null,
  parserOptions: NormalizedParserOptions,
): SvelteParseContext {
  return resolveSvelteParseContext(svelteConfig, parserOptions);
}

function resolveSvelteParseContext(
  svelteConfig: StaticSvelteConfigFile | null,
  parserOptions: NormalizedParserOptions,
): SvelteParseContext {
  return {
    runes: isEnableRunes(svelteConfig, parserOptions),
    compilerVersion,
    svelteConfig,
  };
}
