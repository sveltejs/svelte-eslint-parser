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
export * as meta from "./meta.js";
export { name } from "./meta.js";
export type { SvelteConfig } from "./svelte-config/index.js";

export { AST, ParseError };

// Keys
// eslint-disable-next-line @typescript-eslint/naming-convention -- ignore
export const VisitorKeys = KEYS;

// tools
export { traverseNodes };
