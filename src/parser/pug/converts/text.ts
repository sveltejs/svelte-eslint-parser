import { ParseError } from "../../..";
import type { SveltePugText } from "../../../ast";
import { convertChildren } from "../../converts/element";
import type { PugContext } from "../context";
import type { PugText } from "../pug-ast";
import { parseSvelteFragment } from "./svelte-fragment-parser";

/** Convert for pug text */
export function convertText(
  node: PugText,
  parent: SveltePugText["parent"],
  ctx: PugContext
): SveltePugText {
  const token = ctx.expectToken({
    skipSpaces: true,
    // TODO 'text-html'
    // TODO 'start-pipeless-text'
    expected: ["text"],
  });

  const fragment = parseSvelteFragment(
    node.val,
    ctx.getSvelteIndex(token.loc.start),
    ctx
  );

  const textNode: SveltePugText = {
    type: "SveltePugText",
    body: [],
    parent,
    ...ctx.getConvertLocation(token.loc),
  };

  for (const child of convertChildren(fragment, {} as any, ctx.ctx)) {
    if (
      child.type !== "SvelteText" &&
      child.type !== "SvelteMustacheTag" &&
      child.type !== "SvelteElement"
    ) {
      throw new ParseError(
        `Unexpected text. \`${ctx.ctx.code.slice(...child.range)}\``,
        child.range[0],
        ctx.ctx
      );
    }
    child.parent = textNode;
    textNode.body.push(child);
  }

  return textNode;
}
