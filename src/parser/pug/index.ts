import type { SveltePugTemplateElement, Token } from "../../ast";
import type { Context } from "../../context";
import type PugLexer from "pug-lexer";
import type { PugBlock } from "./pug-ast";
import { convertBlock } from "./converts/block";
import { PugContext } from "./context";
type ParsePugOptions = {
  startIndex: number;
  templateElement: SveltePugTemplateElement;
  ctx: Context;
  oldTokens: Token[];
};

export type PugResult = SveltePugTemplateElement["children"];

/** Parse Pug template */
export function parsePug(code: string, options: ParsePugOptions): PugResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
  const lex: typeof PugLexer = require("pug-lexer");
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
  const parse = require("pug-parser");

  // parse
  const tokens = lex(code);
  const ast: PugBlock = parse([...tokens]);

  const ctx = new PugContext({
    startIndex: options.startIndex,
    templateElement: options.templateElement,
    ctx: options.ctx,
    oldTokens: options.oldTokens,
    tokens,
  });
  const result = convertBlock(ast, options.templateElement, ctx);

  return result;
}
