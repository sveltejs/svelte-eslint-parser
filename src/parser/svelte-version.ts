import { VERSION as SVELTE_VERSION } from "svelte/compiler";

const verStrings = SVELTE_VERSION.split(".");

export const svelteVersion = {
  gte(v: number): boolean {
    return Number(verStrings[0]) >= v;
  },
  hasRunes: Number(verStrings[0]) >= 5,
};
