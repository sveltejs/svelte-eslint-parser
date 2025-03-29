import type * as SvAST from "../svelte-ast-types.js";
import type * as Compiler from "../svelte-ast-types-for-v5.js";
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
  SvelteSnippetBlock,
} from "../../ast/index.js";
import type { Context } from "../../context/index.js";
import { convertChildren } from "./element.js";
import { getWithLoc, indexOf, lastIndexOf } from "./common.js";
import type * as ESTree from "estree";
import {
  getAlternateFromIfBlock,
  getBodyFromEachBlock,
  getCatchFromAwaitBlock,
  getChildren,
  getConsequentFromIfBlock,
  getFallbackFromEachBlock,
  getFragment,
  getPendingFromAwaitBlock,
  getTestFromIfBlock,
  getThenFromAwaitBlock,
  trimChildren,
} from "../compat.js";

/** Get start index of block */
function startBlockIndex(
  code: string,
  endIndex: number,
  block: string,
): number {
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
        return code.startsWith(block, next);
      }
      return false;
    },
    endIndex,
  );
}

function startIndexFromFragment(
  fragment:
    | Compiler.Fragment
    | SvAST.ElseBlock
    | SvAST.ThenBlock
    | SvAST.CatchBlock,
  getBeforeEndIndex: () => number,
) {
  if ((fragment as { start: number }).start != null) {
    return (fragment as { start: number }).start;
  }
  const children = getChildren(fragment);
  return children.length ? children[0].start : getBeforeEndIndex();
}

function endIndexFromFragment(
  fragment:
    | Compiler.Fragment
    | SvAST.IfBlock
    | SvAST.ElseBlock
    | SvAST.PendingBlock
    | SvAST.EachBlock
    | SvAST.ThenBlock
    | SvAST.CatchBlock,
  getBeforeEndIndex: () => number,
): number {
  if ((fragment as { end: number }).end != null) {
    return (fragment as { end: number }).end;
  }
  const children = getChildren(fragment);
  return children.length
    ? children[children.length - 1].end
    : getBeforeEndIndex();
}

function endIndexFromBlock(
  fragment: Compiler.Fragment | SvAST.PendingBlock,
  lastExpression: ESTree.Node | { start: number; end: number },
  ctx: Context,
) {
  return endIndexFromFragment(fragment, () => {
    return ctx.code.indexOf("}", getWithLoc(lastExpression).end) + 1;
  });
}

export function convertIfBlock(
  node: SvAST.IfBlock | Compiler.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context,
): SvelteIfBlockAlone;
export function convertIfBlock(
  node: SvAST.IfBlock | Compiler.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context,
  elseifContext?: { start: number },
): SvelteIfBlockElseIf;
/** Convert for IfBlock */
export function convertIfBlock(
  node: SvAST.IfBlock | Compiler.IfBlock,
  parent: SvelteIfBlock["parent"],
  ctx: Context,
  elseifContext?: { start: number },
): SvelteIfBlock {
  // {#if expr} {:else} {/if}
  // {:else if expr} {/if}
  const elseif = Boolean(elseifContext);
  const nodeStart = startBlockIndex(
    ctx.code,
    elseifContext?.start ?? node.start,
    elseif ? ":else" : "#if",
  );
  const ifBlock: SvelteIfBlock = {
    type: "SvelteIfBlock",
    elseif: Boolean(elseif),
    expression: null as any,
    children: [],
    else: null,
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  } as SvelteIfBlock;

  const test = getTestFromIfBlock(node);
  ctx.scriptLet.nestIfBlock(test, ifBlock, (es) => {
    ifBlock.expression = es;
  });
  const consequent = getConsequentFromIfBlock(node);

  for (const child of convertChildren(
    {
      nodes:
        // Adjust for Svelte v5
        trimChildren(getChildren(consequent)),
    },
    ifBlock,
    ctx,
  )) {
    ifBlock.children.push(child);
  }

  ctx.scriptLet.closeScope();
  if (elseif) {
    const index = ctx.code.indexOf("if", nodeStart);
    ctx.addToken("MustacheKeyword", { start: index, end: index + 2 });
  }
  extractMustacheBlockTokens(ifBlock, ctx, { startOnly: elseif });

  const elseFragment = getAlternateFromIfBlock(node);
  if (!elseFragment) {
    return ifBlock;
  }

  const elseStart = startBlockIndexForElse(elseFragment, consequent, test, ctx);

  const elseChildren = getChildren(elseFragment);
  if (elseChildren.length === 1) {
    const c = elseChildren[0];
    if (c.type === "IfBlock" && c.elseif) {
      const elseBlock: SvelteElseBlockElseIf = {
        type: "SvelteElseBlock",
        elseif: true,
        children: [] as any,
        parent: ifBlock,
        ...ctx.getConvertLocation({
          start: elseStart,
          end: c.end,
        }),
      };
      ifBlock.else = elseBlock;

      const elseIfBlock = convertIfBlock(c, elseBlock, ctx, {
        start: elseStart,
      });
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
      end: endIndexFromFragment(
        elseFragment,
        () => ctx.code.indexOf("}", elseStart + 5) + 1,
      ),
    }),
  };
  ifBlock.else = elseBlock;

  ctx.scriptLet.nestBlock(elseBlock);
  for (const child of convertChildren(
    {
      nodes:
        // Adjust for Svelte v5
        trimChildren(elseChildren),
    },
    elseBlock,
    ctx,
  )) {
    elseBlock.children.push(child);
  }
  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true });

  return ifBlock;
}

function startBlockIndexForElse(
  elseFragment: Compiler.Fragment | SvAST.ElseBlock,
  beforeFragment: Compiler.Fragment | SvAST.IfBlock | SvAST.EachBlock,
  lastExpression: ESTree.Node | { start: number; end: number },
  ctx: Context,
) {
  const elseChildren = getChildren(elseFragment);
  if (elseChildren.length > 0) {
    const c = elseChildren[0];
    if (c.type === "IfBlock" && c.elseif) {
      const contentStart = getWithLoc(getTestFromIfBlock(c)).start;
      if (contentStart <= c.start) {
        return startBlockIndex(ctx.code, contentStart - 1, ":else");
      }
    }
    return startBlockIndex(ctx.code, c.start, ":else");
  }
  const beforeEnd = endIndexFromFragment(beforeFragment, () => {
    return ctx.code.indexOf("}", getWithLoc(lastExpression).end) + 1;
  });
  return startBlockIndex(ctx.code, beforeEnd, ":else");
}

/** Convert for EachBlock */
export function convertEachBlock(
  node: SvAST.EachBlock | Compiler.EachBlock,
  parent: SvelteEachBlock["parent"],
  ctx: Context,
): SvelteEachBlock {
  // {#each expr as item, index (key)} {/each}
  const nodeStart = startBlockIndex(ctx.code, node.start, "#each");
  const eachBlock: SvelteEachBlock = {
    type: "SvelteEachBlock",
    expression: null as any,
    context: null,
    index: null,
    key: null,
    children: [],
    else: null,
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  };

  let indexRange: null | { start: number; end: number } = null;

  if (node.index) {
    const start = ctx.code.indexOf(
      node.index,
      getWithLoc(node.context ?? node.expression).end,
    );
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
    },
  );

  if (node.context) {
    const asStart = ctx.code.indexOf("as", getWithLoc(node.expression).end);
    ctx.addToken("Keyword", {
      start: asStart,
      end: asStart + 2,
    });
  }

  if (node.key) {
    ctx.scriptLet.addExpression(node.key, eachBlock, null, (key) => {
      eachBlock.key = key;
    });
  }
  const body = getBodyFromEachBlock(node);
  eachBlock.children.push(
    ...convertChildren(
      {
        nodes:
          // Adjust for Svelte v5
          trimChildren(getChildren(body)),
      },
      eachBlock,
      ctx,
    ),
  );

  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(eachBlock, ctx);

  const fallbackFragment = getFallbackFromEachBlock(node);
  if (!fallbackFragment) {
    return eachBlock;
  }

  const elseStart = startBlockIndexForElse(
    fallbackFragment,
    body,
    node.key || indexRange || node.context || node.expression,
    ctx,
  );

  const elseBlock: SvelteElseBlockAlone = {
    type: "SvelteElseBlock",
    elseif: false,
    children: [],
    parent: eachBlock,
    ...ctx.getConvertLocation({
      start: elseStart,
      end: endIndexFromFragment(fallbackFragment, () => elseStart),
    }),
  };
  eachBlock.else = elseBlock;

  ctx.scriptLet.nestBlock(elseBlock);
  elseBlock.children.push(
    ...convertChildren(
      {
        nodes:
          // Adjust for Svelte v5
          trimChildren(getChildren(fallbackFragment)),
      },
      elseBlock,
      ctx,
    ),
  );
  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true });

  return eachBlock;
}

/** Convert for AwaitBlock */
export function convertAwaitBlock(
  node: SvAST.AwaitBlock | Compiler.AwaitBlock,
  parent: SvelteAwaitBlock["parent"],
  ctx: Context,
): SvelteAwaitBlock {
  const nodeStart = startBlockIndex(ctx.code, node.start, "#await");
  const awaitBlock = {
    type: "SvelteAwaitBlock",
    expression: null as any,
    kind: "await",
    pending: null as any,
    then: null as any,
    catch: null as any,
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  } as SvelteAwaitBlock;

  ctx.scriptLet.addExpression(
    node.expression,
    awaitBlock,
    null,
    (expression) => {
      awaitBlock.expression = expression;
    },
  );

  const pending = getPendingFromAwaitBlock(node);
  if (pending) {
    const pendingBlock: SvelteAwaitPendingBlock = {
      type: "SvelteAwaitPendingBlock",
      children: [],
      parent: awaitBlock,
      ...ctx.getConvertLocation({
        start: awaitBlock.range[0],
        end: endIndexFromBlock(pending, node.expression, ctx),
      }),
    };
    ctx.scriptLet.nestBlock(pendingBlock);
    pendingBlock.children.push(...convertChildren(pending, pendingBlock, ctx));
    awaitBlock.pending = pendingBlock;
    ctx.scriptLet.closeScope();
  }
  const then = getThenFromAwaitBlock(node);
  if (then) {
    const awaitThen = !pending;
    if (awaitThen) {
      (awaitBlock as SvelteAwaitBlockAwaitThen).kind = "await-then";
    }

    const thenStart = awaitBlock.pending
      ? startBlockIndex(
          ctx.code,
          node.value
            ? getWithLoc(node.value).start
            : startIndexFromFragment(then, () => {
                return awaitBlock.pending.range[1];
              }),
          ":then",
        )
      : nodeStart;
    const thenBlock: SvelteAwaitThenBlock = {
      type: "SvelteAwaitThenBlock",
      awaitThen,
      value: null,
      children: [],
      parent: awaitBlock as any,
      ...ctx.getConvertLocation({
        start: thenStart,
        end: endIndexFromFragment(then, () => {
          return (
            ctx.code.indexOf(
              "}",
              node.value ? getWithLoc(node.value).end : thenStart + 5,
            ) + 1
          );
        }),
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
            {
              script: `const ${id} = ${expression};`,
              nodeType: "VariableDeclaration",
            },
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
    thenBlock.children.push(...convertChildren(then, thenBlock, ctx));
    if (awaitBlock.pending) {
      extractMustacheBlockTokens(thenBlock, ctx, { startOnly: true });
    } else {
      const thenIndex = ctx.code.indexOf(
        "then",
        getWithLoc(node.expression).end,
      );
      ctx.addToken("MustacheKeyword", {
        start: thenIndex,
        end: thenIndex + 4,
      });
    }
    awaitBlock.then = thenBlock;
    ctx.scriptLet.closeScope();
  }
  const catchFragment = getCatchFromAwaitBlock(node);
  if (catchFragment) {
    const awaitCatch = !pending && !then;
    if (awaitCatch) {
      (awaitBlock as SvelteAwaitBlockAwaitCatch).kind = "await-catch";
    }
    const catchStart =
      awaitBlock.then || awaitBlock.pending
        ? startBlockIndex(
            ctx.code,
            node.error
              ? getWithLoc(node.error).start
              : startIndexFromFragment(catchFragment, () => {
                  return (awaitBlock.then || awaitBlock.pending).range[1];
                }),
            ":catch",
          )
        : nodeStart;
    const catchBlock = {
      type: "SvelteAwaitCatchBlock",
      awaitCatch,
      error: null,
      children: [],
      parent: awaitBlock,
      ...ctx.getConvertLocation({
        start: catchStart,
        end: endIndexFromFragment(catchFragment, () => {
          return (
            ctx.code.indexOf(
              "}",
              node.error ? getWithLoc(node.error).end : catchStart + 6,
            ) + 1
          );
        }),
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
    catchBlock.children.push(
      ...convertChildren(catchFragment, catchBlock, ctx),
    );
    if (awaitBlock.pending || awaitBlock.then) {
      extractMustacheBlockTokens(catchBlock, ctx, { startOnly: true });
    } else {
      const catchIndex = ctx.code.indexOf(
        "catch",
        getWithLoc(node.expression).end,
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
  node: SvAST.KeyBlock | Compiler.KeyBlock,
  parent: SvelteKeyBlock["parent"],
  ctx: Context,
): SvelteKeyBlock {
  const nodeStart = startBlockIndex(ctx.code, node.start, "#key");
  const keyBlock: SvelteKeyBlock = {
    type: "SvelteKeyBlock",
    expression: null as any,
    children: [],
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  };

  ctx.scriptLet.addExpression(node.expression, keyBlock, null, (expression) => {
    keyBlock.expression = expression;
  });

  ctx.scriptLet.nestBlock(keyBlock);
  keyBlock.children.push(
    ...convertChildren(
      {
        nodes:
          // Adjust for Svelte v5
          trimChildren(getChildren(getFragment(node))),
      },
      keyBlock,
      ctx,
    ),
  );
  ctx.scriptLet.closeScope();

  extractMustacheBlockTokens(keyBlock, ctx);

  return keyBlock;
}

/** Convert for SnippetBlock */
export function convertSnippetBlock(
  node: Compiler.SnippetBlock,
  parent: SvelteSnippetBlock["parent"],
  ctx: Context,
): SvelteSnippetBlock {
  // {#snippet x(args)}...{/snippet}
  const nodeStart = startBlockIndex(ctx.code, node.start, "#snippet");
  const snippetBlock: SvelteSnippetBlock = {
    type: "SvelteSnippetBlock",
    id: null as any,
    params: [],
    children: [],
    parent,
    ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
  };

  let beforeClosingParen: ESTree.Node;
  if (node.parameters.length > 0) {
    const lastParam = node.parameters[
      node.parameters.length - 1
    ] as ESTree.Pattern & { typeAnnotation?: ESTree.Node };
    beforeClosingParen = lastParam.typeAnnotation ?? lastParam;
  } else {
    beforeClosingParen = node.expression;
  }
  const closeParenIndex = ctx.code.indexOf(
    ")",
    getWithLoc(beforeClosingParen).end,
  );

  const scopeKind =
    parent.type === "Program"
      ? "snippet"
      : // use currentScriptScopeKind
        null;

  ctx.scriptLet.nestSnippetBlock(
    node.expression,
    closeParenIndex,
    snippetBlock,
    scopeKind,
    (id, params) => {
      snippetBlock.id = id;
      snippetBlock.params = params;
    },
  );

  snippetBlock.children.push(
    ...convertChildren(
      {
        nodes:
          // Adjust for Svelte v5
          trimChildren(node.body.nodes),
      },
      snippetBlock,
      ctx,
    ),
  );

  ctx.scriptLet.closeScope();
  extractMustacheBlockTokens(snippetBlock, ctx);

  ctx.snippets.push(snippetBlock);
  return snippetBlock;
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
    | SvelteKeyBlock
    | SvelteSnippetBlock,
  ctx: Context,
  option?: { startOnly?: boolean },
) {
  const startSectionNameStart = indexOf(
    ctx.code,
    (c) => Boolean(c.trim()),
    node.range[0] + 1,
  );
  const startSectionNameEnd = indexOf(
    ctx.code,
    (c) => c === "}" || !c.trim(),
    startSectionNameStart + 1,
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
    endSectionNameEnd - 1,
  );
  ctx.addToken("MustacheKeyword", {
    start: endSectionNameStart,
    end: endSectionNameEnd,
  });
}

/** Generate Awaited like type code */
function generateAwaitThenValueType(id: string) {
  return {
    script: `type ${id}<T> = T extends null | undefined
    ? T
    : T extends { then(value: infer F): any }
    ? F extends (value: infer V, ...args: any) => any
        ? ${id}<V>
        : never
        : T;`,
    nodeType: "TSTypeAliasDeclaration" as const,
  };
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
        : hasIdentifierFor(name, property),
    );
  }
  if (node.type === "ArrayPattern") {
    return node.elements.some(
      (element) => element && hasIdentifierFor(name, element),
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
