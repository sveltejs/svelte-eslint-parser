import type { ScopeManager, Scope } from "eslint-scope";
import type * as ESTree from "estree";
import type { Context, ScriptsSourceCode } from ".";
import type {
  Comment,
  Locations,
  SvelteEachBlock,
  SvelteIfBlock,
  SvelteName,
  SvelteNode,
  Token,
} from "../ast";
import type { ESLintExtendedProgram } from "../parser";
import { getWithLoc } from "../parser/converts/common";
import {
  getInnermostScopeFromNode,
  getScopeFromNode,
  removeAllScopeAndVariableAndReference,
  removeReference,
  removeScope,
} from "../scope";
import { traverseNodes } from "../traverse";
import { UniqueIdGenerator } from "./unique";

type TSAsExpression = {
  type: "TSAsExpression";
  expression: ESTree.Expression;
  typeAnnotation: TSParenthesizedType | ESTree.Node;
};

// TS ESLint v4 Node
type TSParenthesizedType = {
  type: "TSParenthesizedType";
  typeAnnotation: ESTree.Node;
};

export type ScriptLetCallback<E extends ESTree.Node> = (
  es: E,
  options: ScriptLetCallbackOption
) => void;

export type ScriptLetCallbackOption = {
  getScope: (node: ESTree.Node) => Scope;
  getInnermostScope: (node: ESTree.Node) => Scope;
  registerNodeToScope: (node: any, scope: Scope) => void;
  scopeManager: ScopeManager;
  visitorKeys?: { [type: string]: string[] };
};
export type ScriptLetRestoreCallback = (
  node: ESTree.Node,
  tokens: Token[],
  comments: Comment[],
  options: ScriptLetRestoreCallbackOption
) => void;
type ScriptLetRestoreCallbackOption = {
  getScope: (node: ESTree.Node) => Scope;
  getInnermostScope: (node: ESTree.Node) => Scope;
  registerNodeToScope: (node: any, scope: Scope) => void;
  scopeManager: ScopeManager;
  visitorKeys?: { [type: string]: string[] };
};

/**
 * Get node range
 */
function getNodeRange(
  node:
    | ESTree.Node
    | {
        start: number;
        end: number;
        leadingComments?: Comment[];
        trailingComments?: Comment[];
      }
    | {
        range: [number, number];
        leadingComments?: Comment[];
        trailingComments?: Comment[];
      }
): [number, number] {
  let start = null;
  let end = null;
  if (node.leadingComments) {
    start = getWithLoc(node.leadingComments[0]).start;
  }
  if (node.trailingComments) {
    end = getWithLoc(
      node.trailingComments[node.trailingComments.length - 1]
    ).end;
  }
  if (start != null && end != null) {
    return [start, end];
  }

  if ("range" in node) {
    return [start ?? node.range![0], end ?? node.range![1]];
  }
  const loc = getWithLoc(node);
  return [start ?? loc.start, end ?? loc.end];
}

type RestoreCallback = {
  start: number;
  end: number;
  callback: ScriptLetRestoreCallback;
};

type TypeGenHelper = { generateUniqueId: (base: string) => string };

type ObjectShorthandProperty = ESTree.Property & {
  key: ESTree.Identifier;
  value: ESTree.Identifier;
};

/**
 * A class that handles script fragments.
 * The script fragment AST node remaps and connects to the original directive AST node.
 */
export class ScriptLetContext {
  private readonly script: ScriptsSourceCode;

  private readonly ctx: Context;

  private readonly restoreCallbacks: RestoreCallback[] = [];

  private readonly closeScopeCallbacks: (() => void)[] = [];

  private readonly unique = new UniqueIdGenerator();

  public constructor(ctx: Context) {
    this.script = ctx.sourceCode.scripts;
    this.ctx = ctx;
  }

  public addExpression<E extends ESTree.Expression>(
    expression: E | SvelteName,
    parent: SvelteNode,
    typing?: string | null,
    ...callbacks: ScriptLetCallback<E>[]
  ): ScriptLetCallback<E>[] {
    const range = getNodeRange(expression);
    const part = this.ctx.code.slice(...range);
    const isTS = typing && this.ctx.isTypeScript();
    this.appendScript(
      `(${part})${isTS ? `as (${typing})` : ""};`,
      range[0] - 1,
      (st, tokens, comments, result) => {
        const exprSt = st as ESTree.ExpressionStatement;
        const tsAs: TSAsExpression | null = isTS
          ? (exprSt.expression as any)
          : null;
        const node: ESTree.Expression = tsAs?.expression || exprSt.expression;
        // Process for nodes
        for (const callback of callbacks) {
          callback(node as E, result);
        }
        (node as any).parent = parent;

        tokens.shift(); // (
        tokens.pop(); // )
        tokens.pop(); // ;

        if (isTS) {
          removeScope(
            result.scopeManager,
            result.getScope(
              tsAs!.typeAnnotation.type === "TSParenthesizedType"
                ? tsAs!.typeAnnotation.typeAnnotation
                : tsAs!.typeAnnotation
            )
          );
          this.remapNodes(
            [
              {
                offset: range[0] - 1,
                range,
                newNode: node,
              },
            ],
            tokens,
            comments,
            result.visitorKeys
          );
        }

        // Disconnect the tree structure.
        exprSt.expression = null as never;
      }
    );
    return callbacks;
  }

  public addObjectShorthandProperty(
    identifier: SvelteName,
    parent: SvelteNode,
    ...callbacks: ScriptLetCallback<ObjectShorthandProperty>[]
  ): void {
    const range = getNodeRange(identifier);
    const part = this.ctx.code.slice(...range);
    this.appendScript(
      `({${part}});`,
      range[0] - 2,
      (st, tokens, _comments, result) => {
        const exprSt = st as ESTree.ExpressionStatement;
        const objectExpression: ESTree.ObjectExpression =
          exprSt.expression as ESTree.ObjectExpression;
        const node = objectExpression.properties[0] as ObjectShorthandProperty;
        // Process for nodes
        for (const callback of callbacks) {
          callback(node, result);
        }
        (node.key as any).parent = parent;
        (node.value as any).parent = parent;

        tokens.shift(); // (
        tokens.shift(); // {
        tokens.pop(); // }
        tokens.pop(); // )
        tokens.pop(); // ;

        // Disconnect the tree structure.
        exprSt.expression = null as never;
      }
    );
  }

  public addVariableDeclarator(
    expression: ESTree.AssignmentExpression,
    parent: SvelteNode,
    ...callbacks: ScriptLetCallback<ESTree.VariableDeclarator>[]
  ): ScriptLetCallback<ESTree.VariableDeclarator>[] {
    const range = getNodeRange(expression);
    const part = this.ctx.code.slice(...range);
    this.appendScript(
      `const ${part};`,
      range[0] - 6,
      (st, tokens, _comments, result) => {
        const decl = st as ESTree.VariableDeclaration;
        const node = decl.declarations[0];
        // Process for nodes
        for (const callback of callbacks) {
          callback(node, result);
        }
        (node as any).parent = parent;

        const scope = result.getScope(decl);
        for (const variable of scope.variables) {
          for (const def of variable.defs) {
            if (def.parent === decl) {
              (def as any).parent = parent;
            }
          }
        }

        tokens.shift(); // const
        tokens.pop(); // ;

        // Disconnect the tree structure.
        decl.declarations = [];
      }
    );
    return callbacks;
  }

  public nestIfBlock(
    expression: ESTree.Expression,
    ifBlock: SvelteIfBlock,
    callback: ScriptLetCallback<ESTree.Expression>
  ): void {
    const range = getNodeRange(expression);
    const part = this.ctx.code.slice(...range);
    const restore = this.appendScript(
      `if(${part}){`,
      range[0] - 3,
      (st, tokens, _comments, result) => {
        const ifSt = st as ESTree.IfStatement;
        const node = ifSt.test;
        const scope = result.getScope(ifSt.consequent);

        // Process for nodes
        callback(node, result);
        (node as any).parent = ifBlock;

        // Process for scope
        result.registerNodeToScope(ifBlock, scope);

        tokens.shift(); // if
        tokens.shift(); // (
        tokens.pop(); // )
        tokens.pop(); // {
        tokens.pop(); // }

        // Disconnect the tree structure.
        ifSt.test = null as never;
        ifSt.consequent = null as never;
      }
    );
    this.pushScope(restore, "}");
  }

  public nestEachBlock(
    expression: ESTree.Expression,
    context: ESTree.Pattern,
    indexRange: { start: number; end: number } | null,
    eachBlock: SvelteEachBlock,
    callback: (
      expr: ESTree.Expression,
      ctx: ESTree.Pattern,
      index: ESTree.Identifier | null
    ) => void
  ): void {
    const exprRange = getNodeRange(expression);
    const ctxRange = getNodeRange(context);
    let source = "Array.from(";
    const exprOffset = source.length;
    source += `${this.ctx.code.slice(...exprRange)}).forEach((`;
    const ctxOffset = source.length;
    source += this.ctx.code.slice(...ctxRange);
    let idxOffset: number | null = null;
    if (indexRange) {
      source += ",";
      idxOffset = source.length;
      source += this.ctx.code.slice(indexRange.start, indexRange.end);
    }
    source += ")=>{";
    const restore = this.appendScript(
      source,
      exprRange[0] - exprOffset,
      (st, tokens, comments, result) => {
        const expSt = st as ESTree.ExpressionStatement;
        const call = expSt.expression as ESTree.CallExpression;
        const fn = call.arguments[0] as ESTree.ArrowFunctionExpression;
        const callArrayFrom = (call.callee as ESTree.MemberExpression)
          .object as ESTree.CallExpression;
        const expr = callArrayFrom.arguments[0] as ESTree.Expression;
        const ctx = fn.params[0]!;
        const idx = (fn.params[1] ?? null) as ESTree.Identifier | null;
        const scope = result.getScope(fn.body);

        // Process for nodes
        callback(expr, ctx, idx);
        (expr as any).parent = eachBlock;
        (ctx as any).parent = eachBlock;
        if (idx) {
          (idx as any).parent = eachBlock;
        }

        // Process for scope
        result.registerNodeToScope(eachBlock, scope);
        for (const v of scope.variables) {
          for (const def of v.defs) {
            if (def.node === fn) {
              def.node = eachBlock;
            }
          }
        }
        // remove Array reference
        const arrayId = (callArrayFrom.callee as ESTree.MemberExpression)
          .object;
        const ref = scope.upper!.references.find(
          (r) => r.identifier === arrayId
        );
        if (ref) {
          removeReference(ref, scope.upper!);
        }

        tokens.shift(); // Array
        tokens.shift(); // .
        tokens.shift(); // from
        tokens.shift(); // (

        tokens.pop(); // )
        tokens.pop(); // =>
        tokens.pop(); // {
        tokens.pop(); // }
        tokens.pop(); // )
        tokens.pop(); // ;

        const map = [
          {
            offset: exprOffset,
            range: exprRange,
            newNode: expr,
          },
          {
            offset: ctxOffset,
            range: ctxRange,
            newNode: ctx,
          },
        ];
        if (indexRange) {
          map.push({
            offset: idxOffset!,
            range: [indexRange.start, indexRange.end],
            newNode: idx!,
          });
        }
        this.remapNodes(map, tokens, comments, result.visitorKeys);

        // Disconnect the tree structure.
        expSt.expression = null as never;
      }
    );
    this.pushScope(restore, "});");
  }

  public nestBlock(block: SvelteNode): void;

  public nestBlock(
    block: SvelteNode,
    params: (ESTree.Pattern | SvelteName)[],
    parents: SvelteNode[],
    callback: (
      nodes: ESTree.Pattern[],
      options: ScriptLetCallbackOption
    ) => void,
    typings:
      | string[]
      | ((helper: TypeGenHelper) => {
          typings: string[];
          preparationScript?: string[];
        })
  ): void;

  public nestBlock(
    block: SvelteNode,
    params?: (ESTree.Pattern | SvelteName)[],
    parents?: SvelteNode[],
    callback?: (
      nodes: ESTree.Pattern[],
      options: ScriptLetCallbackOption
    ) => void,
    typings?:
      | string[]
      | ((helper: TypeGenHelper) => {
          typings: string[];
          preparationScript?: string[];
        })
  ): void {
    let arrayTypings: string[] = [];
    if (typings && this.ctx.isTypeScript()) {
      if (Array.isArray(typings)) {
        arrayTypings = typings;
      } else {
        const generatedTypes = typings({
          generateUniqueId: (base) => this.generateUniqueId(base),
        });
        arrayTypings = generatedTypes.typings;
        if (generatedTypes.preparationScript) {
          for (const preparationScript of generatedTypes.preparationScript) {
            this.appendScriptWithoutOffset(
              preparationScript,
              (node, tokens, comments, result) => {
                tokens.length = 0;
                comments.length = 0;
                removeAllScopeAndVariableAndReference(node, result);
              }
            );
          }
        }
      }
    }
    if (!params) {
      const restore = this.appendScript(
        `{`,
        block.range[0],
        (st, tokens, _comments, result) => {
          const blockSt = st as ESTree.BlockStatement;

          // Process for scope
          const scope = result.getScope(blockSt);
          result.registerNodeToScope(block, scope);

          tokens.length = 0; // clear tokens

          // Disconnect the tree structure.
          blockSt.body = null as never;
        }
      );
      this.pushScope(restore, "}");
    } else {
      const ranges = params.map(getNodeRange).sort(([a], [b]) => a - b);

      const maps: {
        index: number;
        offset: number;
        range: readonly [number, number];
      }[] = [];

      let source = "";
      for (let index = 0; index < ranges.length; index++) {
        const range = ranges[index];
        if (source) {
          source += ",";
        }
        const offset = source.length + 1; /* ( */
        source += this.ctx.code.slice(...range);
        maps.push({
          index: maps.length,
          offset,
          range,
        });
        if (this.ctx.isTypeScript()) {
          source += ` : (${arrayTypings[index]})`;
        }
      }
      const restore = this.appendScript(
        `(${source})=>{`,
        maps[0].range[0] - 1,
        (st, tokens, comments, result) => {
          const exprSt = st as ESTree.ExpressionStatement;
          const fn = exprSt.expression as ESTree.ArrowFunctionExpression;
          const scope = result.getScope(fn.body);

          // Process for nodes
          callback!(fn.params, result);
          for (let index = 0; index < fn.params.length; index++) {
            const p = fn.params[index];
            if (this.ctx.isTypeScript()) {
              const typeAnnotation = (p as any).typeAnnotation;
              delete (p as any).typeAnnotation;

              p.range![1] = typeAnnotation.range[0];
              p.loc!.end = {
                line: typeAnnotation.loc.start.line,
                column: typeAnnotation.loc.start.column,
              };

              removeAllScopeAndVariableAndReference(typeAnnotation, result);
            }
            (p as any).parent = parents![index];
          }

          // Process for scope
          result.registerNodeToScope(block, scope);
          for (const v of scope.variables) {
            for (const def of v.defs) {
              if (def.node === fn) {
                def.node = block;
              }
            }
          }

          tokens.shift(); // (
          tokens.pop(); // )
          tokens.pop(); // =>
          tokens.pop(); // {
          tokens.pop(); // }
          tokens.pop(); // ;

          this.remapNodes(
            maps.map((m) => {
              return {
                offset: m.offset,
                range: m.range,
                newNode: fn.params[m.index],
              };
            }),
            tokens,
            comments,
            result.visitorKeys
          );

          // Disconnect the tree structure.
          exprSt.expression = null as never;
        }
      );
      this.pushScope(restore, "};");
    }
  }

  public closeScope(): void {
    this.closeScopeCallbacks.pop()!();
  }

  private appendScript(
    text: string,
    offset: number,
    callback: (
      node: ESTree.Node,
      tokens: Token[],
      comments: Comment[],
      options: ScriptLetCallbackOption
    ) => void
  ) {
    const resultCallback = this.appendScriptWithoutOffset(
      text,
      (node, tokens, comments, result) => {
        this.fixLocations(
          node,
          tokens,
          comments,
          offset - resultCallback.start,
          result.visitorKeys
        );
        callback(node, tokens, comments, result);
      }
    );
    return resultCallback;
  }

  private appendScriptWithoutOffset(
    text: string,
    callback: (
      node: ESTree.Node,
      tokens: Token[],
      comments: Comment[],
      options: ScriptLetCallbackOption
    ) => void
  ) {
    const { start: startOffset, end: endOffset } = this.script.addLet(text);

    const restoreCallback: RestoreCallback = {
      start: startOffset,
      end: endOffset,
      callback,
    };
    this.restoreCallbacks.push(restoreCallback);
    return restoreCallback;
  }

  private pushScope(restoreCallback: RestoreCallback, closeToken: string) {
    this.closeScopeCallbacks.push(() => {
      this.script.addLet(closeToken);
      restoreCallback.end = this.script.getCurrentVirtualCodeLength();
    });
  }

  /**
   * Restore AST nodes
   */
  public restore(result: ESLintExtendedProgram): void {
    let orderedRestoreCallback = this.restoreCallbacks.shift();
    if (!orderedRestoreCallback) {
      return;
    }
    const separateIndexes = this.script.separateIndexes;
    const tokens = result.ast.tokens;
    const processedTokens = [];
    const comments = result.ast.comments;
    const processedComments = [];
    const nodeToScope = getNodeToScope(result.scopeManager!);

    let tok;
    while ((tok = tokens.shift())) {
      if (separateIndexes.includes(tok.range[0]) && tok.value === ";") {
        break;
      }
      if (orderedRestoreCallback.start <= tok.range[0]) {
        tokens.unshift(tok);
        break;
      }
      processedTokens.push(tok);
    }
    while ((tok = comments.shift())) {
      if (orderedRestoreCallback.start <= tok.range[0]) {
        comments.unshift(tok);
        break;
      }
      processedComments.push(tok);
    }

    const targetNodes = new Map<ESTree.Node, RestoreCallback>();
    const removeStatements: ESTree.Statement[] = [];

    traverseNodes(result.ast, {
      visitorKeys: result.visitorKeys,
      enterNode: (node) => {
        while (node.range && separateIndexes.includes(node.range[1] - 1)) {
          node.range[1]--;
          node.loc!.end.column--;
        }
        if (node.loc!.end.column < 0) {
          node.loc!.end = this.ctx.getLocFromIndex(node.range![1]);
        }
        if (
          (node as any).parent === result.ast &&
          separateIndexes[0] <= node.range![0]
        ) {
          removeStatements.push(node as any);
        }
        if (!orderedRestoreCallback) {
          return;
        }
        if (
          orderedRestoreCallback.start <= node.range![0] &&
          node.range![1] <= orderedRestoreCallback.end
        ) {
          targetNodes.set(node, orderedRestoreCallback);
          orderedRestoreCallback = this.restoreCallbacks.shift();
        }
        //
      },
      leaveNode(node) {
        const restoreCallback = targetNodes.get(node);
        if (!restoreCallback) {
          return;
        }
        const startIndex = {
          token: tokens.findIndex((t) => restoreCallback.start <= t.range[0]),
          comment: comments.findIndex(
            (t) => restoreCallback.start <= t.range[0]
          ),
        };

        const endIndex = {
          token: tokens.findIndex(
            (t) => restoreCallback.end < t.range[1],
            startIndex.token
          ),
          comment: comments.findIndex(
            (t) => restoreCallback.end < t.range[1],
            startIndex.comment
          ),
        };
        if (endIndex.token === -1) {
          endIndex.token = tokens.length;
        }
        if (endIndex.comment === -1) {
          endIndex.comment = comments.length;
        }
        const targetTokens = tokens.splice(
          startIndex.token,
          endIndex.token - startIndex.token
        );
        const targetComments = comments.splice(
          startIndex.comment,
          endIndex.comment - startIndex.comment
        );
        restoreCallback.callback(node, targetTokens, targetComments, {
          getScope,
          getInnermostScope,
          registerNodeToScope,
          scopeManager: result.scopeManager!,
          visitorKeys: result.visitorKeys,
        });

        processedTokens.push(...targetTokens);
        processedComments.push(...targetComments);
      },
    });
    for (const st of removeStatements) {
      const index = result.ast.body.indexOf(st);
      result.ast.body.splice(index, 1);
    }

    result.ast.tokens = processedTokens;
    result.ast.comments = processedComments;

    // Helpers
    /** Get scope */
    function getScope(node: ESTree.Node) {
      return getScopeFromNode(result.scopeManager!, node);
    }

    /** Get innermost scope */
    function getInnermostScope(node: ESTree.Node) {
      return getInnermostScopeFromNode(result.scopeManager!, node);
    }

    /** Register node to scope */
    function registerNodeToScope(node: any, scope: Scope): void {
      scope.block = node;
      const scopes = nodeToScope.get(node);
      if (scopes) {
        scopes.push(scope);
      } else {
        nodeToScope.set(node, [scope]);
      }
    }
  }

  private remapNodes(
    maps: {
      offset: number;
      range: readonly [number, number];
      newNode: ESTree.Node;
    }[],
    tokens: Token[],
    comments: Comment[],
    visitorKeys?: { [type: string]: string[] }
  ) {
    const targetMaps = [...maps];
    const first = targetMaps.shift()!;
    let tokenIndex = 0;
    for (; tokenIndex < tokens.length; tokenIndex++) {
      const token = tokens[tokenIndex];
      if (first.range[1] <= token.range[0]) {
        break;
      }
    }

    for (const map of targetMaps) {
      const startOffset = map.offset - first.offset + first.range[0];
      const endOffset = startOffset + (map.range[1] - map.range[0]);

      let removeCount = 0;
      let target = tokens[tokenIndex];
      while (target && target.range[1] <= startOffset) {
        removeCount++;
        target = tokens[tokenIndex + removeCount];
      }
      if (removeCount) {
        tokens.splice(tokenIndex, removeCount);
      }

      const bufferTokens: Token[] = [];
      for (; tokenIndex < tokens.length; tokenIndex++) {
        const token = tokens[tokenIndex];
        if (endOffset <= token.range[0]) {
          break;
        }
        bufferTokens.push(token);
      }
      this.fixLocations(
        map.newNode,
        bufferTokens,
        comments.filter(
          (t) => startOffset <= t.range[0] && t.range[1] <= endOffset
        ),
        map.range[0] - startOffset,
        visitorKeys
      );
    }
    tokens.splice(tokenIndex);
  }

  /** Fix locations */
  private fixLocations(
    node: ESTree.Node,
    tokens: Token[],
    comments: Comment[],
    offset: number,
    visitorKeys?: { [type: string]: string[] }
  ) {
    if (offset === 0) {
      return;
    }
    const traversed = new Set<any>();
    traverseNodes(node, {
      visitorKeys,
      enterNode: (n) => {
        if (traversed.has(n)) {
          return;
        }
        traversed.add(n);
        if (traversed.has(n.range)) {
          if (!traversed.has(n.loc)) {
            // However, `Node#loc` may not be shared.
            const locs = this.ctx.getConvertLocation({
              start: n.range![0],
              end: n.range![1],
            });
            applyLocs(n, locs);
            traversed.add(n.loc);
          }
        } else {
          const start = n.range![0] + offset;
          const end = n.range![1] + offset;
          const locs = this.ctx.getConvertLocation({ start, end });
          applyLocs(n, locs);
          traversed.add(n.range);
          traversed.add(n.loc);
        }
      },
      leaveNode: Function.prototype as any,
    });
    for (const t of tokens) {
      const start = t.range[0] + offset;
      const end = t.range[1] + offset;
      const locs = this.ctx.getConvertLocation({ start, end });
      applyLocs(t, locs);
    }
    for (const t of comments) {
      const start = t.range[0] + offset;
      const end = t.range[1] + offset;
      const locs = this.ctx.getConvertLocation({ start, end });
      applyLocs(t, locs);
    }
  }

  private generateUniqueId(base: string) {
    return this.unique.generate(
      base,
      this.ctx.code,
      this.script.getCurrentVirtualCode()
    );
  }
}

/**
 * applyLocs
 */
function applyLocs(target: Locations | ESTree.Node, locs: Locations) {
  target.loc = locs.loc;
  target.range = locs.range;
  if (typeof (target as any).start === "number") {
    delete (target as any).start;
  }
  if (typeof (target as any).end === "number") {
    delete (target as any).end;
  }
}

/** Get the node to scope map from given scope manager  */
function getNodeToScope(
  scopeManager: ScopeManager
): WeakMap<ESTree.Node, Scope[]> {
  if ("__nodeToScope" in scopeManager) {
    return (scopeManager as any).__nodeToScope;
  }

  // transform scopeManager
  const nodeToScope = new WeakMap<ESTree.Node, Scope[]>();
  for (const scope of scopeManager.scopes) {
    const scopes = nodeToScope.get(scope.block);
    if (scopes) {
      scopes.push(scope);
    } else {
      nodeToScope.set(scope.block, [scope]);
    }
  }
  scopeManager.acquire = function (node, inner) {
    /**
     * predicate
     */
    function predicate(testScope: Scope) {
      if (testScope.type === "function" && testScope.functionExpressionScope) {
        return false;
      }
      return true;
    }

    const scopes = nodeToScope.get(node as any);

    if (!scopes || scopes.length === 0) {
      return null;
    }

    // Heuristic selection from all scopes.
    // If you would like to get all scopes, please use ScopeManager#acquireAll.
    if (scopes.length === 1) {
      return scopes[0];
    }

    if (inner) {
      for (let i = scopes.length - 1; i >= 0; --i) {
        const scope = scopes[i];

        if (predicate(scope)) {
          return scope;
        }
      }
    } else {
      for (let i = 0, iz = scopes.length; i < iz; ++i) {
        const scope = scopes[i];

        if (predicate(scope)) {
          return scope;
        }
      }
    }

    return null;
  };

  return nodeToScope;
}
