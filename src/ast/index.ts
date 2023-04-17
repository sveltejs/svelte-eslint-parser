import type { SvelteHTMLNode } from "./html";
import type { SvelteScriptNode } from "./script";

export * from "./common";
export * from "./html";
export * from "./script";
export * from "./style";

export type SvelteNode = SvelteHTMLNode | SvelteScriptNode;
