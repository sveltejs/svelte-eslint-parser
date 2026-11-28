import type * as ESTree from "estree";
import type { SvelteRenderTag } from "../../ast/index.js";
import type { Context } from "../../context/index.js";
import type * as Compiler from "../svelte-ast-types-for-v5.js";

/** Convert for RenderTag */
export function convertRenderTag(
  node: Compiler.RenderTag,
  parent: SvelteRenderTag["parent"],
  ctx: Context,
): SvelteRenderTag {
  const mustache: SvelteRenderTag = {
    type: "SvelteRenderTag",
    expression: null as any,
    parent,
    ...ctx.getConvertLocation(node),
  };
  ctx.scriptLet.addExpression(
    node.expression,
    mustache,
    null,
    (
      expression:
        | ESTree.SimpleCallExpression
        | (ESTree.ChainExpression & {
            expression: ESTree.SimpleCallExpression;
          }),
    ) => {
      mustache.expression = expression;
      (mustache.expression as any).parent = mustache;
    },
  );
  const atRenderStart = ctx.code.indexOf("@render", mustache.range[0]);
  ctx.addToken("MustacheKeyword", {
    start: atRenderStart,
    end: atRenderStart + 7,
  });
  return mustache;
}
