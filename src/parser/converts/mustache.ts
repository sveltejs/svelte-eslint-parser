import type {
  SvelteDebugTag,
  SvelteMustacheTag,
  SvelteMustacheTagRaw,
  SvelteMustacheTagText,
} from "../../ast";
import type { Context } from "../../context";
import type * as SvAST from "../svelte-ast-types";
import { hasTypeInfo } from "../../utils";
import type * as Compiler from "svelte/compiler";

/** Convert for MustacheTag */
export function convertMustacheTag(
  node: SvAST.MustacheTag | Compiler.ExpressionTag,
  parent: SvelteMustacheTag["parent"],
  typing: string | null,
  ctx: Context,
): SvelteMustacheTagText {
  return convertMustacheTag0(node, "text", parent, typing, ctx);
}
/** Convert for MustacheTag */
export function convertRawMustacheTag(
  node: SvAST.RawMustacheTag | Compiler.HtmlTag,
  parent: SvelteMustacheTag["parent"],
  ctx: Context,
): SvelteMustacheTagRaw {
  const mustache: SvelteMustacheTagRaw = convertMustacheTag0(
    node,
    "raw",
    parent,
    null,
    ctx,
  );
  const atHtmlStart = ctx.code.indexOf("@html", mustache.range[0]);
  ctx.addToken("MustacheKeyword", {
    start: atHtmlStart,
    end: atHtmlStart + 5,
  });
  return mustache;
}

/** Convert for DebugTag */
export function convertDebugTag(
  node: SvAST.DebugTag,
  parent: SvelteDebugTag["parent"],
  ctx: Context,
): SvelteDebugTag {
  const mustache: SvelteDebugTag = {
    type: "SvelteDebugTag",
    identifiers: [],
    parent,
    ...ctx.getConvertLocation(node),
  };
  for (const id of node.identifiers) {
    ctx.scriptLet.addExpression(id, mustache, null, (es) => {
      mustache.identifiers.push(es);
    });
  }
  const atDebugStart = ctx.code.indexOf("@debug", mustache.range[0]);
  ctx.addToken("MustacheKeyword", {
    start: atDebugStart,
    end: atDebugStart + 6,
  });
  return mustache;
}

/** Convert to MustacheTag */
function convertMustacheTag0<T extends SvelteMustacheTag>(
  node:
    | SvAST.MustacheTag
    | SvAST.RawMustacheTag
    | Compiler.ExpressionTag
    | Compiler.HtmlTag,
  kind: T["kind"],
  parent: T["parent"],
  typing: string | null,
  ctx: Context,
): T {
  const mustache = {
    type: "SvelteMustacheTag",
    kind,
    expression: null as any,
    parent,
    ...ctx.getConvertLocation(node),
  } as T;

  ctx.scriptLet.addExpression(
    node.expression,
    mustache,
    hasTypeInfo(node.expression) ? null : typing,
    (es) => {
      mustache.expression = es;
    },
  );
  return mustache;
}
