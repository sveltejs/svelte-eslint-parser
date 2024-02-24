import type * as ESTree from "estree";
import type { SvelteRenderTag } from "../../ast";
import type { Context } from "../../context";
import type * as SvAST from "../svelte-ast-types";
import { getWithLoc } from "./common";

/** Convert for RenderTag */
export function convertRenderTag(
  node: SvAST.RenderTag,
  parent: SvelteRenderTag["parent"],
  ctx: Context,
): SvelteRenderTag {
  const mustache: SvelteRenderTag = {
    type: "SvelteRenderTag",
    callee: null as any,
    arguments: [],
    parent,
    ...ctx.getConvertLocation(node),
  };
  const calleeRange = getWithLoc(node.expression);
  const closeParenIndex = ctx.code.indexOf(
    ")",
    node.arguments.length
      ? getWithLoc(node.arguments[node.arguments.length - 1]).end
      : calleeRange.end,
  );
  ctx.scriptLet.addExpressionFromRange(
    [calleeRange.start, closeParenIndex + 1],
    mustache,
    null,
    (expression: ESTree.SimpleCallExpression) => {
      mustache.callee = expression.callee as ESTree.Identifier;
      (mustache.callee as any).parent = mustache;
      for (const argument of expression.arguments) {
        mustache.arguments.push(argument);
        (argument as any).parent = mustache;
      }
    },
  );
  const atRenderStart = ctx.code.indexOf("@render", mustache.range[0]);
  ctx.addToken("MustacheKeyword", {
    start: atRenderStart,
    end: atRenderStart + 7,
  });
  return mustache;
}
