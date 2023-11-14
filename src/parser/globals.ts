import { VERSION as SVELTE_VERSION } from "svelte/compiler";

const globalsForSvelte4: Readonly<string[]> = [
  "$$slots",
  "$$props",
  "$$restProps",
] as const;
export const globalsForSvelte5 = [
  "$state",
  "$derived",
  "$effect",
  "$effect.pre",
  "$props",
] as const;
export const globals = SVELTE_VERSION.startsWith("5")
  ? [...globalsForSvelte4, ...globalsForSvelte5]
  : globalsForSvelte4;
