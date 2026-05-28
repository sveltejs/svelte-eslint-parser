import * as AST from "./ast/index.js";
import { traverseNodes } from "./traverse.js";
import { KEYS } from "./visitor-keys.js";
import { ParseError } from "./errors.js";
export {
  parseForESLint,
  type StyleContext,
  type StyleContextNoStyleElement,
  type StyleContextParseError,
  type StyleContextSuccess,
  type StyleContextUnknownLang,
} from "./parser/index.js";
export { name } from "./meta.js";
// If we use `export * as meta from "./meta.js"`,
// the structuredClone performed by eslint-plugin-prettier will fail,
// so we will need to re-export it as a plain object.
// https://github.com/prettier/eslint-plugin-prettier/blob/b307125faeb58b6dbfd5d8812b2dffcfdc8358df/eslint-plugin-prettier.js#L199
import * as metaModule from "./meta.js";
export const meta = { ...metaModule };
export type { SvelteConfig } from "./svelte-config/index.js";

export { AST, ParseError };

// Keys
// eslint-disable-next-line @typescript-eslint/naming-convention -- ignore
export const VisitorKeys = KEYS;

// tools
export { traverseNodes };

// Install the `ts.sys.readFile` hook that lets TypeScript type-check Svelte
// files through `@typescript-eslint/parser`'s projectService without any
// on-disk artifacts. Gated by `SVELTE_ESLINT_PARSER_TS_SYS_HOOK=1`, so
// projects that don't opt in pay nothing.
import { installTsSysHook } from "./ts-sys-hook.js";
installTsSysHook();
