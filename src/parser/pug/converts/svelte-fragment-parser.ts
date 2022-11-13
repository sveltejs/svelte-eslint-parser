import { parse, walk } from "svelte/compiler";
import { ParseError } from "../../..";
import type { PugContext } from "../context";
import type * as SvAST from "../../svelte-ast-types";
import type ESTree from "estree";
import { getWithLoc } from "./common";

type Locs = { start: number; end: number };

/** Parse for svelte template fragment */
export function parseSvelteFragment(
  code: string,
  offset: number,
  ctx: PugContext
): SvAST.Fragment {
  try {
    const ast = parse(code) as SvAST.Ast;
    walk(ast.html, {
      enter(node: any) {
        node.start += offset;
        node.end += offset;
      },
    });
    return ast.html;
  } catch (e: any) {
    if (typeof e.pos === "number") {
      const err = new ParseError(
        e.message,
        (e.pos as number) + offset,
        ctx.ctx
      );
      (err as any).svelteCompilerError = e;
      throw err;
    }
    throw e;
  }
}

/** Parse for expression using svelte parser */
export function parseExpression<E extends ESTree.Expression>(
  expression: string,
  offset: number,
  expected: E["type"],
  ctx: PugContext
): E & Locs {
  const fragment = parseSvelteFragment(`{${expression}}`, offset - 1, ctx);
  if (!fragment.children.length) {
    throw new ParseError("Expected token, but empty", offset, ctx.ctx);
  }
  const child = fragment.children[0];
  if (child.type !== "MustacheTag") {
    throw new ParseError("Unexpected token", child.start, ctx.ctx);
  }
  if (fragment.children.length > 1) {
    throw new ParseError("Unexpected token", child.end, ctx.ctx);
  }
  const node = getWithLoc(child.expression);
  if (node.type !== expected) {
    throw new ParseError(
      `Expected node type ${expected}, but ${node.type}`,
      node.start,
      ctx.ctx
    );
  }
  return node as E & Locs;
}

/** Parse for svelte {#each args} arguments */
export function parseSvelteEachArgs(
  eachArgs: string,
  offset: number,
  ctx: PugContext
): {
  expression: ESTree.Expression & Locs;
  context: ESTree.Pattern & Locs;
  index?: string;
  key: (ESTree.Expression & Locs) | undefined;
} {
  const fragment = parseSvelteFragment(
    `{#each ${eachArgs}}{/each}`,
    offset - "{#each ".length,
    ctx
  );
  if (!fragment.children.length) {
    throw new ParseError("Expected token, but empty", offset, ctx.ctx);
  }
  const child = fragment.children[0];
  if (child.type !== "EachBlock") {
    throw new ParseError("Unexpected token", child.start, ctx.ctx);
  }
  if (fragment.children.length > 1) {
    throw new ParseError("Unexpected token", child.end, ctx.ctx);
  }

  return {
    expression: getWithLoc(child.expression),
    context: getWithLoc(child.context),
    index: child.index,
    key: getWithLoc(child.key),
  };
}

/** Parse for svelte attribute key */
export function parseSvelteAttributeKey(
  key: string,
  offset: number,
  ctx: PugContext
): SvAST.AttributeOrDirective {
  let fragment;

  try {
    fragment = parseSvelteFragment(
      `<div ${key}={E} />`,
      offset - "<div ".length,
      ctx
    );
  } catch (_e) {
    fragment = parseSvelteFragment(
      `<div ${key} />`,
      offset - "<div ".length,
      ctx
    );
  }
  if (!fragment.children.length) {
    throw new ParseError("Expected token, but empty", offset, ctx.ctx);
  }
  const child = fragment.children[0];
  if (child.type !== "Element") {
    throw new ParseError("Unexpected token", child.start, ctx.ctx);
  }
  if (fragment.children.length > 1) {
    throw new ParseError("Unexpected token", child.end, ctx.ctx);
  }
  const attr = child.attributes[0];
  if (child.attributes.length > 1) {
    throw new ParseError("Unexpected token", attr.end, ctx.ctx);
  }

  return attr;
}
