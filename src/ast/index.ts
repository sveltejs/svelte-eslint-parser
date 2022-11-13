import type { SvelteHTMLNode } from "./html";
import type { SvelteScriptNode } from "./script";
import type { SveltePugNode } from "./pug";

export * from "./common";
export * from "./html";
export * from "./script";
export * from "./pug";

export type SvelteNode = SvelteHTMLNode | SvelteScriptNode | SveltePugNode;
