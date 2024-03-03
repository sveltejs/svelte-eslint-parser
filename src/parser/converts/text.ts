import type { SvelteLiteral, SvelteText } from "../../ast";
import type { Context } from "../../context";
import type * as SvAST from "../svelte-ast-types";
/** Convert for Text */
export function convertText(
  node: SvAST.Text,
  parent: SvelteText["parent"],
  ctx: Context,
): SvelteText {
  const text: SvelteText = {
    type: "SvelteText",
    value: node.data,
    parent,
    ...ctx.getConvertLocation(node),
  };
  extractTextTokens(node, ctx);
  return text;
}

/** Convert for Text to Literal */
export function convertTextToLiteral(
  node: SvAST.Text,
  parent: SvelteLiteral["parent"],
  ctx: Context,
): SvelteLiteral {
  const text: SvelteLiteral = {
    type: "SvelteLiteral",
    value: node.data,
    parent,
    ...ctx.getConvertLocation(node),
  };
  extractTextTokens(node, ctx);
  return text;
}

/** Extract tokens */
function extractTextTokens(
  node: { start: number; end: number },
  ctx: Context,
): void {
  const loc = node;
  let start = loc.start;
  let word = false;
  for (let index = loc.start; index < loc.end; index++) {
    if (word !== Boolean(ctx.code[index].trim())) {
      if (start < index) {
        ctx.addToken("HTMLText", { start, end: index });
      }
      word = !word;
      start = index;
    }
  }
  if (start < loc.end) {
    ctx.addToken("HTMLText", { start, end: loc.end });
  }
}
