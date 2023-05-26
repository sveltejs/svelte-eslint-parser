import type { Root } from "postcss";

export interface StyleContext {
  sourceLang: string | null;
  sourceAst: Root | null;
  sourceParseError: unknown;
}
