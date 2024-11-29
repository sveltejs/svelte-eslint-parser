import type { SvelteParseContext } from "./svelte-parse-context.js";

const globalsForSvelte = ["$$slots", "$$props", "$$restProps"] as const;
export const globalsForRunes = [
  "$state",
  "$derived",
  "$effect",
  "$props",
  "$bindable",
  "$inspect",
  "$host",
] as const;
type Global =
  | (typeof globalsForSvelte)[number]
  | (typeof globalsForRunes)[number];
export function getGlobalsForSvelte(
  svelteParseContext: SvelteParseContext,
): readonly Global[] {
  if (svelteParseContext.runes) {
    return [...globalsForSvelte, ...globalsForRunes];
  }
  return globalsForSvelte;
}
export function getGlobalsForSvelteScript(
  svelteParseContext: SvelteParseContext,
): readonly Global[] {
  if (svelteParseContext.runes) {
    return globalsForRunes;
  }
  return [];
}
