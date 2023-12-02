import { svelteVersion } from "./svelte-version";

const globalsForSvelte4 = ["$$slots", "$$props", "$$restProps"] as const;
export const globalsForRunes = [
  "$state",
  "$derived",
  "$effect",
  "$props",
  "$inspect",
] as const;
const globalsForSvelte5 = [...globalsForSvelte4, ...globalsForRunes];
export const globals = svelteVersion.gte(5)
  ? globalsForSvelte5
  : globalsForSvelte4;
export const globalsForSvelteScript = svelteVersion.gte(5)
  ? globalsForRunes
  : [];
