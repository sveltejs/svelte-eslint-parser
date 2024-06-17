import { VERSION as compilerVersion } from "svelte/compiler";

export { compilerVersion };

const verStrings = compilerVersion.split(".");

export const svelteVersion = {
  gte(v: number): boolean {
    return Number(verStrings[0]) >= v;
  },
};
