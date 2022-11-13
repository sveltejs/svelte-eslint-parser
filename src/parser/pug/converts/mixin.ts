import type { SveltePugEachBlock } from "../../../ast";
import type { PugContext } from "../context";
import type { PugMixin } from "../pug-ast";
import { parseExpression, parseSvelteEachArgs } from "./svelte-fragment-parser";
import type ESTree from "estree";
import { ParseError } from "../../..";
import { convertBlock } from "./block";
import { setEndLocation } from "./common";

type MixinNode = SveltePugEachBlock;

/** Convert for pug mixin */
export function convertMixin(
  node: PugMixin,
  parent: MixinNode["parent"],
  ctx: PugContext
): MixinNode {
  if (!node.call) {
    throw new Error(`Unsupported mixin definition \`mixin ${node.name}\``);
  }
  if (node.name === "each") {
    return convertEachMixin(node, parent, ctx);
  }
  throw new Error(`Unsupported mixin +${node.name}`);
}

/** Convert for `+each` */
function convertEachMixin(
  node: PugMixin,
  parent: SveltePugEachBlock["parent"],
  ctx: PugContext
): SveltePugEachBlock {
  const token = ctx.expectToken({ skipSpaces: true, expected: ["call"] });
  const { argsStartIndex } = extractMixinTokens(node, ctx, {
    requireArgs: true,
  });

  const eachBlock: SveltePugEachBlock = {
    type: "SveltePugEachBlock",
    expression: null as any,
    context: null as any,
    index: null,
    key: null,
    children: [],
    else: null,
    parent,
    ...ctx.getConvertLocation(token.loc),
  };
  const expression = parseExpression<ESTree.Literal>(
    node.args!,
    argsStartIndex,
    "Literal",
    ctx
  );
  let argStartOffset = expression.start;
  if (typeof expression.value === "string") {
    argStartOffset++;
  }
  const args = parseSvelteEachArgs(`${expression.value}`, argStartOffset, ctx);

  let indexRange: null | { start: number; end: number } = null;

  if (args.index) {
    const start = ctx.ctx.code.indexOf(args.index, args.context.end);
    indexRange = {
      start,
      end: start + args.index.length,
    };
  }

  ctx.ctx.scriptLet.nestEachBlock(
    args.expression,
    args.context,
    indexRange,
    eachBlock,
    (expression, context, index) => {
      eachBlock.expression = expression;
      eachBlock.context = context;
      eachBlock.index = index;
    }
  );

  const asStart = ctx.ctx.code.indexOf("as", args.expression.end);
  ctx.ctx.addToken("Keyword", {
    start: asStart,
    end: asStart + 2,
  });

  if (args.key) {
    ctx.ctx.scriptLet.addExpression(args.key, eachBlock, null, (key) => {
      eachBlock.key = key;
    });
  }
  if (node.block) {
    eachBlock.children.push(...convertBlock(node.block, eachBlock, ctx));

    setEndLocation(
      eachBlock,
      eachBlock.children[eachBlock.children.length - 1]
    );
  }

  ctx.ctx.scriptLet.closeScope();

  // TODO: else
  //   if (!node.else) {
  //     return eachBlock;
  //   }

  //   const elseStart = startBlockIndex(ctx.code, node.else.start - 1);

  //   const elseBlock: SvelteElseBlockAlone = {
  //     type: "SvelteElseBlock",
  //     elseif: false,
  //     children: [],
  //     parent: eachBlock,
  //     ...ctx.getConvertLocation({
  //       start: elseStart,
  //       end: node.else.end,
  //     }),
  //   };
  //   eachBlock.else = elseBlock;

  //   ctx.scriptLet.nestBlock(elseBlock);
  //   elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx));
  //   ctx.scriptLet.closeScope();
  //   extractMixinTokens(elseBlock, ctx, { startOnly: true });

  return eachBlock;
}

/** Extract mixin tokens */
function extractMixinTokens<RA extends boolean>(
  node: PugMixin,
  ctx: PugContext,
  options: { requireArgs: RA }
): RA extends true
  ? {
      argsStartIndex: number;
    }
  : {
      // empty
    } {
  const startIndex = ctx.getSvelteIndex(node);
  const nameStartIndex = ctx.ctx.code.indexOf(node.name, startIndex + 1);
  const nameEndIndex = nameStartIndex + node.name.length;

  // name (e.g. each)
  ctx.ctx.addToken("Keyword", {
    start: nameStartIndex,
    end: nameEndIndex,
  });

  if (node.args != null) {
    const openParenIndex = ctx.ctx.code.indexOf("(", nameEndIndex);
    const argsStartIndex = ctx.ctx.code.indexOf(node.args, openParenIndex + 1);

    return {
      argsStartIndex,
    };
  }
  if (options.requireArgs) {
    throw new ParseError(
      `Expected arguments, but arguments not found.`,
      ctx.getSvelteIndex(node),
      ctx.ctx
    );
  }

  return {} as never;
}
