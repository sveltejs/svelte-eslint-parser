import type * as SvAST from "../svelte-ast-types";
import type {
  SvelteAwaitBlock,
  SvelteAwaitBlockAwaitCatch,
  SvelteAwaitBlockAwaitThen,
  SvelteAwaitCatchBlock,
  SvelteAwaitPendingBlock,
  SvelteAwaitThenBlock,
  SvelteEachBlock,
  SvelteElseBlock,
  SvelteElseBlockAlone,
  SvelteElseBlockElseIf,
  SvelteIfBlock,
  SvelteIfBlockAlone,
  SvelteIfBlockElseIf,
  SvelteKeyBlock,
} from "../../ast";
import type { Context } from "../../context";
import { convertChildren } from "./element";
import { getWithLoc, indexOf, lastIndexOf } from "./common";
import type * as ESTree from "estree";

/** Get start index of block */
function startBlockIndex(code: string, endIndex: number): number {
  return lastIndexOf(
    code,
    (c, index) => {
      if (c !== "{") {
        return false;
      }
      for (let next = index + 1; next < code.length; next++) {
        const nextC = code[next];
        if (!nextC.trim()) {
          continue;
        }
        return code.startsWith("#if", next) || code.startsWith(":else", next);
      }
      return false;
    },
    endIndex
  );
}

export function convertIfBlock(
  node: SvAST.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context
): SvelteIfBlockAlone;
export function convertIfBlock(
  node: SvAST.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context,
  elseif: true
): SvelteIfBlockElseIf;
/** Convert for IfBlock */
export function convertIfBlock(
  node: SvAST.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context,
  elseif?: true
): SvelteIfBlock {
  // {#if expr} {:else} {/if}
  // {:else if expr} {/if}
  const nodeStart = elseif
    ? startBlockIndex(ctx.code, node.start - 1)
    : node.start;
  const ifBlock: SvelteIfBlock = {
    type: "SvelteIfBlock",
    elseif: Boolean(elseif),
    expression: null as any,
    children: [],
    else: null,
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  } as SvelteIfBlock;

  ctx.scriptLet.nestIfBlock(node.expression, ifBlock, (es) => {
    ifBlock.expression = es;
  });
  ifBlock.children.push(...convertChildren(node, ifBlock, ctx));
  ctx.scriptLet.closeScope();
  if (elseif) {
    const index = ctx.code.indexOf("if", nodeStart);
    ctx.addToken("MustacheKeyword", { start: index, end: index + 2 });
  }
  extractMustacheBlockTokens(ifBlock, ctx, { startOnly: elseif });

  if (!node.else) {
    return ifBlock;
  }

  const elseStart = startBlockIndex(ctx.code, node.else.start - 1);

  if (node.else.children.length === 1) {
    const c = node.else.children[0];
    if (c.type === "IfBlock" && c.elseif) {
      const elseBlock: SvelteElseBlockElseIf = {
        type: "SvelteElseBlock",
        elseif: true,
        children: [] as any,
        parent: ifBlock,
        ...ctx.getConvertLocation({
          start: elseStart,
          end: node.else.end,
        }),
      };
      ifBlock.else = elseBlock;

      const elseIfBlock = convertIfBlock(c, elseBlock, ctx, true);
      // adjust loc
      elseBlock.range[1] = elseIfBlock.range[1];
      elseBlock.loc.end = {
        line: elseIfBlock.loc.end.line,
        column: elseIfBlock.loc.end.column,
      };
      elseBlock.children = [elseIfBlock];
      return ifBlock;
    }
  }
  const elseBlock: SvelteElseBlockAlone = {
    type: "SvelteElseBlock",
    elseif: false,
    children: [],
    parent: ifBlock,
    ...ctx.getConvertLocation({
      start: elseStart,
      end: node.else.end,
    }),
  };
  ifBlock.else = elseBlock;

  ctx.scriptLet.nestBlock(elseBlock);
  elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx));
  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true });

  return ifBlock;
}

/** Convert for EachBlock */
export function convertEachBlock(
  node: SvAST.EachBlock,
  parent: SvelteEachBlock["parent"],
  ctx: Context
): SvelteEachBlock {
  // {#each expr as item, index (key)} {/each}
  const eachBlock: SvelteEachBlock = {
    type: "SvelteEachBlock",
    expression: null as any,
    context: null as any,
    index: null,
    key: null,
    children: [],
    else: null,
    parent,
    ...ctx.getConvertLocation(node),
  };

  let indexRange: null | { start: number; end: number } = null;

  if (node.index) {
    const start = ctx.code.indexOf(node.index, getWithLoc(node.context).end);
    indexRange = {
      start,
      end: start + node.index.length,
    };
  }

  ctx.scriptLet.nestEachBlock(
    node.expression,
    node.context,
    indexRange,
    eachBlock,
    (expression, context, index) => {
      eachBlock.expression = expression;
      eachBlock.context = context;
      eachBlock.index = index;
    }
  );

  const asStart = ctx.code.indexOf("as", getWithLoc(node.expression).end);
  ctx.addToken("Keyword", {
    start: asStart,
    end: asStart + 2,
  });

  if (node.key) {
    ctx.scriptLet.addExpression(node.key, eachBlock, null, (key) => {
      eachBlock.key = key;
    });
  }
  eachBlock.children.push(...convertChildren(node, eachBlock, ctx));

  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(eachBlock, ctx);

  if (!node.else) {
    return eachBlock;
  }

  const elseStart = startBlockIndex(ctx.code, node.else.start - 1);

  const elseBlock: SvelteElseBlockAlone = {
    type: "SvelteElseBlock",
    elseif: false,
    children: [],
    parent: eachBlock,
    ...ctx.getConvertLocation({
      start: elseStart,
      end: node.else.end,
    }),
  };
  eachBlock.else = elseBlock;

  ctx.scriptLet.nestBlock(elseBlock);
  elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx));
  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true });

  return eachBlock;
}

/** Convert for AwaitBlock */
export function convertAwaitBlock(
  node: SvAST.AwaitBlock,
  parent: SvelteAwaitBlock["parent"],
  ctx: Context
): SvelteAwaitBlock {
  const awaitBlock = {
    type: "SvelteAwaitBlock",
    expression: null as any,
    kind: "await",
    pending: null as any,
    then: null as any,
    catch: null as any,
    parent,
    ...ctx.getConvertLocation(node),
  } as SvelteAwaitBlock;

  ctx.scriptLet.addExpression(
    node.expression,
    awaitBlock,
    null,
    (expression) => {
      awaitBlock.expression = expression;
    }
  );

  if (!node.pending.skip) {
    const pendingBlock: SvelteAwaitPendingBlock = {
      type: "SvelteAwaitPendingBlock",
      children: [],
      parent: awaitBlock,
      ...ctx.getConvertLocation({
        start: awaitBlock.range[0],
        end: node.pending.end,
      }),
    };
    ctx.scriptLet.nestBlock(pendingBlock);
    pendingBlock.children.push(
      ...convertChildren(node.pending, pendingBlock, ctx)
    );
    awaitBlock.pending = pendingBlock;
    ctx.scriptLet.closeScope();
  }
  if (!node.then.skip) {
    const awaitThen = Boolean(node.pending.skip);
    if (awaitThen) {
      (awaitBlock as SvelteAwaitBlockAwaitThen).kind = "await-then";
    }

    const thenStart = awaitBlock.pending ? node.then.start : node.start;
    const thenBlock: SvelteAwaitThenBlock = {
      type: "SvelteAwaitThenBlock",
      awaitThen,
      value: null,
      children: [],
      parent: awaitBlock as any,
      ...ctx.getConvertLocation({
        start: thenStart,
        end: node.then.end,
      }),
    };
    if (node.value) {
      const baseParam = {
        node: node.value,
        parent: thenBlock,
        callback(value: ESTree.Pattern) {
          thenBlock.value = value;
        },
        typing: "any",
      };

      ctx.scriptLet.nestBlock(thenBlock, (typeCtx) => {
        if (!typeCtx) {
          return {
            param: baseParam,
          };
        }
        const expression = ctx.getText(node.expression);
        if (node.expression.type === "Literal") {
          return {
            param: {
              ...baseParam,
              typing: expression,
            },
          };
        }
        const idAwaitThenValue = typeCtx.generateUniqueId("AwaitThenValue");
        if (
          node.expression.type === "Identifier" &&
          // We cannot use type annotations like `(x: Foo<x>)` if they have the same identifier name.
          !hasIdentifierFor(node.expression.name, baseParam.node)
        ) {
          return {
            preparationScript: [generateAwaitThenValueType(idAwaitThenValue)],
            param: {
              ...baseParam,
              typing: `${idAwaitThenValue}<(typeof ${expression})>`,
            },
          };
        }
        const id = typeCtx.generateUniqueId(expression);
        return {
          preparationScript: [
            `const ${id} = ${expression};`,
            generateAwaitThenValueType(idAwaitThenValue),
          ],
          param: {
            ...baseParam,
            typing: `${idAwaitThenValue}<(typeof ${id})>`,
          },
        };
      });
    } else {
      ctx.scriptLet.nestBlock(thenBlock);
    }
    thenBlock.children.push(...convertChildren(node.then, thenBlock, ctx));
    if (awaitBlock.pending) {
      extractMustacheBlockTokens(thenBlock, ctx, { startOnly: true });
    } else {
      const thenIndex = ctx.code.indexOf(
        "then",
        getWithLoc(node.expression).end
      );
      ctx.addToken("MustacheKeyword", {
        start: thenIndex,
        end: thenIndex + 4,
      });
    }
    awaitBlock.then = thenBlock;
    ctx.scriptLet.closeScope();
  }
  if (!node.catch.skip) {
    const awaitCatch = Boolean(node.pending.skip && node.then.skip);
    if (awaitCatch) {
      (awaitBlock as SvelteAwaitBlockAwaitCatch).kind = "await-catch";
    }
    const catchStart =
      awaitBlock.pending || awaitBlock.then ? node.catch.start : node.start;
    const catchBlock = {
      type: "SvelteAwaitCatchBlock",
      awaitCatch,
      error: null,
      children: [],
      parent: awaitBlock,
      ...ctx.getConvertLocation({
        start: catchStart,
        end: node.catch.end,
      }),
    } as SvelteAwaitCatchBlock;

    if (node.error) {
      ctx.scriptLet.nestBlock(catchBlock, [
        {
          node: node.error,
          parent: catchBlock,
          typing: "Error",
          callback: (error) => {
            catchBlock.error = error;
          },
        },
      ]);
    } else {
      ctx.scriptLet.nestBlock(catchBlock);
    }
    catchBlock.children.push(...convertChildren(node.catch, catchBlock, ctx));
    if (awaitBlock.pending || awaitBlock.then) {
      extractMustacheBlockTokens(catchBlock, ctx, { startOnly: true });
    } else {
      const catchIndex = ctx.code.indexOf(
        "catch",
        getWithLoc(node.expression).end
      );
      ctx.addToken("MustacheKeyword", {
        start: catchIndex,
        end: catchIndex + 5,
      });
    }
    awaitBlock.catch = catchBlock;
    ctx.scriptLet.closeScope();
  }

  extractMustacheBlockTokens(awaitBlock, ctx);

  return awaitBlock;
}

/** Convert for KeyBlock */
export function convertKeyBlock(
  node: SvAST.KeyBlock,
  parent: SvelteKeyBlock["parent"],
  ctx: Context
): SvelteKeyBlock {
  const keyBlock: SvelteKeyBlock = {
    type: "SvelteKeyBlock",
    expression: null as any,
    children: [],
    parent,
    ...ctx.getConvertLocation(node),
  };

  ctx.scriptLet.addExpression(node.expression, keyBlock, null, (expression) => {
    keyBlock.expression = expression;
  });

  ctx.scriptLet.nestBlock(keyBlock);
  keyBlock.children.push(...convertChildren(node, keyBlock, ctx));
  ctx.scriptLet.closeScope();

  extractMustacheBlockTokens(keyBlock, ctx);

  return keyBlock;
}

/** Extract mustache block tokens */
function extractMustacheBlockTokens(
  node:
    | SvelteIfBlock
    | SvelteEachBlock
    | SvelteElseBlock
    | SvelteAwaitBlock
    | SvelteAwaitThenBlock
    | SvelteAwaitCatchBlock
    | SvelteKeyBlock,
  ctx: Context,
  option?: { startOnly?: true }
) {
  const startSectionNameStart = indexOf(
    ctx.code,
    (c) => Boolean(c.trim()),
    node.range[0] + 1
  );
  const startSectionNameEnd = indexOf(
    ctx.code,
    (c) => c === "}" || !c.trim(),
    startSectionNameStart + 1
  );
  ctx.addToken("MustacheKeyword", {
    start: startSectionNameStart,
    end: startSectionNameEnd,
  });

  if (option?.startOnly) {
    return;
  }

  const endSectionNameEnd =
    lastIndexOf(ctx.code, (c) => Boolean(c.trim()), node.range[1] - 2) + 1;
  const endSectionNameStart = lastIndexOf(
    ctx.code,
    (c) => c === "{" || c === "/" || !c.trim(),
    endSectionNameEnd - 1
  );
  ctx.addToken("MustacheKeyword", {
    start: endSectionNameStart,
    end: endSectionNameEnd,
  });
}

/** Generate Awaited like type code */
function generateAwaitThenValueType(id: string) {
  return `type ${id}<T> = T extends null | undefined
    ? T
    : T extends { then(value: infer F): any }
    ? F extends (value: infer V, ...args: any) => any
        ? ${id}<V>
        : never
        : T;`;
}

/** Checks whether the given name identifier is exists or not. */
function hasIdentifierFor(name: string, node: ESTree.Pattern): boolean {
  if (node.type === "Identifier") {
    return node.name === name;
  }
  if (node.type === "ObjectPattern") {
    return node.properties.some((property) =>
      property.type === "Property"
        ? hasIdentifierFor(name, property.value)
        : hasIdentifierFor(name, property)
    );
  }
  if (node.type === "ArrayPattern") {
    return node.elements.some(
      (element) => element && hasIdentifierFor(name, element)
    );
  }
  if (node.type === "RestElement") {
    return hasIdentifierFor(name, node.argument);
  }
  if (node.type === "AssignmentPattern") {
    return hasIdentifierFor(name, node.left);
  }

  return false;
}
