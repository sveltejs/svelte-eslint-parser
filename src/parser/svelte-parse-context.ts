import type * as Compiler from "svelte/compiler";
import type * as SvAST from "./svelte-ast-types";
import type { NormalizedParserOptions } from "./parser-options";
import { compilerVersion, svelteVersion } from "./svelte-version";
import type { SvelteConfig } from "../svelte-config";
import type { ScopeManager } from "eslint-scope";
import { globalsForRunes } from "./globals";

/** The context for parsing. */
export type PublicSvelteParseContext = {
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

export const enum RunesMode {
  off,
  on,
  auto,
}

export class SvelteParseContext {
  private runesMode: RunesMode;

  private readonly svelteConfig: SvelteConfig | null;

  public constructor(runesMode: RunesMode, svelteConfig: SvelteConfig | null) {
    this.runesMode = runesMode;
    this.svelteConfig = svelteConfig;
  }

  public get runes(): boolean {
    if (this.runesMode === RunesMode.auto)
      throw new Error("Runes mode is auto");
    return this.runesMode === RunesMode.on;
  }

  public analyzeRunesMode(scopeManager: ScopeManager): void {
    if (this.runesMode !== RunesMode.auto) return;
    this.runesMode = scopeManager.globalScope.through.some((reference) =>
      globalsForRunes.includes(reference.identifier.name as never),
    )
      ? RunesMode.on
      : RunesMode.off;
  }

  /** Convert it into a format provided by the parser service. */
  public toPublic(): PublicSvelteParseContext {
    return {
      runes: this.runes,
      compilerVersion,
      svelteConfig: this.svelteConfig,
    };
  }
}

function getRunesMode(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): RunesMode {
  if (!svelteVersion.gte(5)) return RunesMode.off;
  if (parserOptions.svelteFeatures?.runes != null) {
    if (parserOptions.svelteFeatures.runes === "auto") return RunesMode.auto;
    return parserOptions.svelteFeatures.runes ? RunesMode.on : RunesMode.off;
  }
  if (svelteConfig?.compilerOptions?.runes != null) {
    return svelteConfig.compilerOptions.runes ? RunesMode.on : RunesMode.off;
  }
  return RunesMode.auto;
}

export function isMaybeEnableRunes(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
): boolean {
  const mode = getRunesMode(svelteConfig, parserOptions);
  return mode === RunesMode.on || mode === RunesMode.auto;
}

export function resolveSvelteParseContextForSvelte(
  svelteConfig: SvelteConfig | null,
  parserOptions: NormalizedParserOptions,
  svelteAst: Compiler.Root | SvAST.AstLegacy,
): SvelteParseContext {
  const svelteOptions = (svelteAst as Compiler.Root).options;
  if (svelteOptions?.runes != null) {
    return new SvelteParseContext(
      svelteOptions.runes ? RunesMode.on : RunesMode.off,
      svelteConfig,
    );
  }
  return resolveSvelteParseContext(svelteConfig, parserOptions);
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
  return new SvelteParseContext(
    getRunesMode(svelteConfig, parserOptions),
    svelteConfig,
  );
}
