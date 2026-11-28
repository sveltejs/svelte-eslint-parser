import type {} from "svelte"; // FIXME: Workaround to get type information for "svelte/compiler"
import { parse } from "svelte/compiler";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import { Context } from "../context/index.js";
import { convertSvelteRoot } from "./converts/index.js";
import type { SvelteProgram } from "../ast/index.js";
import { ParseError } from "../errors.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { svelteVersion } from "./svelte-version.js";

type SvelteAst = Compiler.Root | SvAST.AstLegacy;

// Keys of template nodes that hold child nodes, in Svelte 5 and in Svelte 3
// and 4. They do not lead to JavaScript expressions or attributes.
const TEMPLATE_CHILD_KEYS = [
  "fragment",
  "nodes",
  "children",
  "consequent",
  "alternate",
  "else",
  "body",
  "fallback",
  "pending",
  "then",
  "catch",
];

/**
 * Parse the template of the given context.
 * If the scan of a skipped mustache tag ran too far, or the compiler
 * throws, the blocks are extracted again without skipping mustache tags,
 * as before.
 */
export function parseTemplateWithContext(ctx: Context): {
  ctx: Context;
  template: ReturnType<typeof parseTemplate>;
} {
  let result = ctx;
  if (ctx.skippedRanges.length) {
    let svelteAst: SvelteAst | null = null;
    try {
      svelteAst = parseSvelte(ctx.sourceCode.template, ctx, ctx.parserOptions);
    } catch {
      // The scan may have hidden markup that the compiler cannot parse.
    }
    if (svelteAst && !hasTemplateNodeIn(svelteAst, ctx.skippedRanges)) {
      return { ctx, template: convertTemplate(svelteAst, ctx) };
    }
    result = new Context(ctx.code, ctx.parserOptions, { skipMustaches: false });
  }
  return {
    ctx: result,
    template: parseTemplate(
      result.sourceCode.template,
      result,
      result.parserOptions,
    ),
  };
}

/**
 * Checks whether a template node starts inside one of the ranges.
 * A correct range has only JavaScript in it. A range that runs too far ends
 * at a `}` in a later node or top-level block, so that node or block starts
 * inside the range. If it ends in the same start tag, it can only hide
 * attributes, and `<script>` text in an attribute value is not a block either.
 */
function hasTemplateNodeIn(
  svelteAst: SvelteAst,
  ranges: [number, number][],
): boolean {
  const root = svelteAst as any;
  // `options` is `<svelte:options>` in Svelte 5. The other children of the
  // top-level blocks are not template nodes.
  const blocks = [root.instance, root.module, root.css, root.options];
  if (blocks.some((block) => isInRanges(block?.start, ranges))) return true;
  const nodes: any[] = [root.fragment, root.html];
  while (nodes.length) {
    const node = nodes.pop();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) {
      for (const child of node) nodes.push(child);
      continue;
    }
    if (isInRanges(node.start, ranges)) return true;
    for (const key of TEMPLATE_CHILD_KEYS) nodes.push(node[key]);
  }
  return false;
}

/**
 * Checks whether the index is strictly inside one of the ranges.
 * The ranges are sorted and do not overlap.
 */
function isInRanges(index: unknown, ranges: [number, number][]): boolean {
  if (typeof index !== "number") return false;
  let low = 0;
  let high = ranges.length;
  // Find the first range that starts at or after the index.
  while (low < high) {
    const mid = (low + high) >> 1;
    if (ranges[mid][0] < index) low = mid + 1;
    else high = mid;
  }
  return low > 0 && index < ranges[low - 1][1];
}

/**
 * Parse for template
 */
export function parseTemplate(
  code: string,
  ctx: Context,
  parserOptions: NormalizedParserOptions,
): {
  ast: SvelteProgram;
  svelteAst: SvelteAst;
} {
  return convertTemplate(parseSvelte(code, ctx, parserOptions), ctx);
}

/** Parse the template with the Svelte compiler */
function parseSvelte(
  code: string,
  ctx: Context,
  parserOptions: NormalizedParserOptions,
): SvelteAst {
  try {
    const options: {
      filename?: string | undefined;
      modern: true;
    } = {
      filename: parserOptions.filePath,
      ...(svelteVersion.gte(5) ? { modern: true } : ({} as never)),
    };
    return parse(code, options);
  } catch (e) {
    throw toParseError(e, ctx);
  }
}

/** Convert the template AST of the Svelte compiler */
function convertTemplate(
  svelteAst: SvelteAst,
  ctx: Context,
): {
  ast: SvelteProgram;
  svelteAst: SvelteAst;
} {
  try {
    if ("comments" in svelteAst) {
      ctx.scriptLet.setTemplateComments(svelteAst.comments);
    }
    const ast = convertSvelteRoot(svelteAst, ctx);
    return {
      ast,
      svelteAst,
    };
  } catch (e) {
    throw toParseError(e, ctx);
  }
}

/** Convert an error of the Svelte compiler */
function toParseError(e: any, ctx: Context): unknown {
  if (typeof e.pos === "number") {
    const err = new ParseError(e.message, e.pos, ctx);
    (err as any).svelteCompilerError = e;
    return err;
  }
  if (Array.isArray(e.position) && typeof e.position[0] === "number") {
    const err = new ParseError(e.message, e.position[0], ctx);
    (err as any).svelteCompilerError = e;
    return err;
  }
  return e;
}
